# Architecture & design

This document explains how `@panmdaa/validate` is built and **why** it is built that way.

## Design principles

1. **One definition drives types and runtime.** A schema is a plain value that doubles as a type provider (`Infer`/`Input`/`Output`). There is no separate type declaration to keep in sync.
2. **Zero runtime dependencies, pure ESM, tree-shakeable.** The package pulls in nothing; unused schema families can be dropped by the bundler.
3. **Fast hot paths.** Parsing should avoid allocation when nothing changes, and valid inputs should be cheap.
4. **Abort-early by default.** The common question is "is this valid?" — answer it without doing more work than necessary. Collect-all mode is opt-in.
5. **Minimal public API.** One factory namespace, one `Schema` shape, a small set of wrappers.

## The node model

Internally every schema is a node:

```ts
interface SchemaNode {
  kind: string;
  def: unknown;
}
```

- `kind` — `"string"`, `"number"`, `"object"`, `"array"`, `"tuple"`, `"union"`, `"discriminatedUnion"`, `"record"`, `"optional"`, `"nullable"`, `"default"`, `"transform"`, `"refine"`, `"literal"`, `"enum"`, `"custom"`, `"unknown"`, `"any"`, `"never"`.
- `def` — the payload: checks for primitives, `{ shape, mode }` for objects, `{ inner, value }` for wrappers, and so on.

Schema factories in `src/schemas/` build nodes. Chaining (`.min()`, `.transform()`, …) creates a **new** node wrapping the old one — definitions are immutable and safely shareable.

## Compilation: two backends

When a schema is created, `makeCallable` (in `src/core/schema.ts`) compiles it **once**:

```ts
const collectRun = compile(node);      // interpreter
let run: RunFn;
try {
  run = codegenRun(node);              // code generator
} catch {
  run = collectRun;                    // fallback
}
```

Both backends produce a `RunFn`:

```ts
type RunFn = (value: unknown, ctx: RunCtx) => unknown;
```

where `ctx` carries the current path, the issue list, and parse-mode flags. A run returns the (possibly transformed) value, or the `FAIL` sentinel.

### Why two backends?

- The **code generator** emits a dedicated JavaScript function (via `new Function`) with the checks inlined — no dispatch, no closure indirection, minimal GC pressure on the hot path.
- The **interpreter** walks the node tree through small closures. It is the always-available, simple-to-reason-about path, and it is the backend used for `safeParseAll`.

Generation is attempted once per schema and cached. If generation ever throws (an unknown node kind, a genuinely un-inlinable construct), the interpreter takes over silently.

### The interpreter (`src/core/compile.ts`)

A `switch` on `node.kind` dispatches to a compiler. Compound compilers receive `compile` and use it to pre-compile their children (`childPlan`), then return a closure that validates one value against one `ctx`.

### The code generator (`src/core/codegen.ts`)

A `Gen` class builds the function source line by line:

- `emit()` appends a line.
- `tmp()` allocates fresh variable names (`$c0`, `$out1`, …) so generated code never collides.
- `add(value)` puts a value (regex, predicate, transform fn, …) into an `externals` array; the generated source references it as `$e0`, `$e1`, … Those externals are injected as the final argument, alongside the `fail`/`FAIL` helpers.
- `q()` safely JSON-stringifies string literals for embedding.

Failures use two modes (`FM`):

- **hard** — emit `return $fail(...)` (or `return $FAIL`) straight away. Used for a whole parse.
- **soft** — emit `ok = false; break label;` so an inner failure can be observed without aborting the enclosing construct. Used inside `union` options.

`union` wraps each option in a **labeled block** and `break`s out on success, so a failed option can roll back its issues (`ctx.issues.length = entry`) and try the next one:

```ts
$union0: {
  var $entry0 = ctx.issues.length;
  if ($e0(value) === true) break $union0;   // leaf option
  ctx.issues.length = $entry0;
  …
}
```

`discriminatedUnion` dispatches on `String(value[key])` with a `$matched` flag and fails once if nothing matched.

#### Why compound nodes assign instead of `return`

The earliest bug in the codebase was that nested compound nodes emitted `return value` / `return $out`, which **exits the entire generated function** instead of returning to the enclosing construct. The generator now compiles every node to write its result back into the local variable and lets the top level emit a single `return value;` at the end:

```ts
gen.node(node, "value", { kind: "hard" });
gen.emit(`return value;`);
```

Nested objects/arrays/tuples therefore mutate `value` (or a `$out` temp) in place and never abort the enclosing scope.

### Leaf fast path

`inlineLeaf(node)` decides whether a node can be reduced to a single boolean check closure (`LeafCheck`). Primitives, `literal`, `enum`, `custom`, `unknown`, `any`, `never`, and `optional`/`nullable` wrapping a leaf all qualify. The same closure is reused by the interpreter, the generator, and the compound compilers (`childPlan` produces `{ kind: "test", test }` vs `{ kind: "run", run }`). This keeps array/object hot loops free of per-item dispatch.

## Transforms and rebuilding

`detectTransforms` walks a node tree and reports whether any descendant applies a `transform` (or `default`). Compounds use this to decide whether the output must be **rebuilt**:

- An array item with a transform needs a new output array (`$out[i] = result`); without one, the input array is returned as-is.
- An object shape with any transform rebuilds the object; without one, and in `strip` mode with all keys required and an exact key count, the **input object is returned by reference** — zero allocation.

## Parse modes

`RunCtx` carries the mode:

| Mode | Mechanism |
|------|-----------|
| `safeParse` (default) | `collect: false` — first failure short-circuits, `FAIL` propagates, issues keep the single root cause |
| `safeParseAll` | `collect: true` — the interpreter keeps validating siblings and appends every issue; a leaf still reports only its first failing check |
| `is` | `failFast: true` — `fail()` returns `FAIL` without even building an issue |

`safeParseAll` always uses the **interpreter** because it is the natural implementation for "walk everything and collect": it mutates `ctx.issues` directly and continues after failures. The generated functions are optimized for the common abort-early path.

## Object behavior

`compileObject` validates `isObject` (a non-null object that is not an array), then per mode:

- **strip** — validate declared keys; drop the rest (rebuild, or identity fast path when possible).
- **passthrough** — validate declared keys; copy unknown keys into the rebuilt output.
- **strict** — reject any unknown key with `Unexpected key: ${key}` before validating.

The identity fast path is only taken when nothing can change the output, which is exactly what makes it safe to return the caller's reference.

## Records and paths

`record` iterates own keys (`Object.hasOwn`) and validates each value. Compound compilers push/pop the current key or index onto `ctx.path` around child validation, which is what produces precise paths like `["user", "address", 0, "zip"]`.

## Why `default` removes `undefined` from its type

```ts
default<D>(value: D): Schema<In | undefined, D | Exclude<Out, undefined>>;
```

Once a default exists, the parsed value is guaranteed non-`undefined`. Removing it from the output type makes downstream `.transform()` and `.refine()` receive a well-typed value and keeps `Infer` honest (`Validator.string().default("x")` infers `string`, not `string | undefined`).

## Why `tuple` uses a variadic spread

```ts
tuple: <T extends readonly Schema[]>(items: [...T]) => …
```

On modern TypeScript, a plain `items: T` parameter infers `T` as an array type (`(string | number)[]`) instead of a tuple, losing positional types. The `[...T]` spread signals tuple inference, so `TupleOutput` correctly resolves to `[string, number]`.

## Directory layout

```
src/
├── index.ts        ← root barrel — re-exports core, schemas, Validator
├── validator.ts    ← the Validator namespace (factory functions)
├── core/
│   ├── compile.ts  ← interpreter: compiles a node into a RunFn
│   ├── codegen.ts  ← generator: emits a dedicated function via new Function
│   ├── schema.ts   ← makeCallable — binds parse methods to a node
│   ├── run.ts      ← fail() + describe() — issue construction
│   ├── constants.ts← FAIL sentinel
│   ├── detect-transforms.ts ← decides whether output must be rebuilt
│   └── types.ts    ← Schema, Result, Issue, Infer/Input/Output
├── schemas/        ← declarative schema factories (primitive + compound)
└── compilers/      ← runtime backends: leaf checks, compound compilers, wrappers
```

The separation is deliberate: `schemas/` is pure data (no execution logic), `compilers/` contains the two execution backends, and `core/` owns compilation, codegen, and the shared types both layers depend on.
