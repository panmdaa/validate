<img src="./misc/banner.svg" alt="Panmdaa Validate" />

<p align="center">
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license" />
  </a>
  <a href="https://npmjs.org/package/@panmdaa/validate">
    <img src="https://badgen.now.sh/npm/v/@panmdaa/validate" alt="version" />
  </a>
  <a href="https://npmjs.org/package/@panmdaa/validate">
    <img src="https://badgen.now.sh/npm/dm/@panmdaa/validate" alt="downloads" />
  </a>
  <a href="https://bundlephobia.com/result?p=@panmdaa/validate">
    <img src="https://img.shields.io/bundlephobia/min/@panmdaa/validate" alt="Bundle Size" />
  </a>
  <a href="https://bundlephobia.com/result?p=@panmdaa/validate">
    <img src="https://img.shields.io/bundlephobia/minzip/@panmdaa/validate" alt="Bundle Size (gzip)" />
  </a>
</p>


# @panmdaa/validate

Zero-dependency TypeScript validation library — chain-style schemas, lazy compilation, abort-early parsing.

**`@panmdaa/validate`** is a from-scratch validation library built for TypeScript. Schemas are plain, chainable values that double as type providers: `Infer`, `Input`, and `Output` derive precise types from the schema tree, so one definition drives both runtime checks and compile-time types. Each schema compiles itself once: it first attempts a dedicated generated function and falls back to the interpreter when needed. Pure ESM, tree-shakeable, zero runtime dependencies.

```
npm install @panmdaa/validate
```

## Quick look

```ts
import { Validator, type Infer } from "@panmdaa/validate";

const user = Validator.object({
  id: Validator.number().int().positive(),
  name: Validator.string().minLength(1).maxLength(100),
  email: Validator.string().email(),
  role: Validator.enum(["admin", "user"]),
  tags: Validator.array(Validator.string()).max(10),
});

type User = Infer<typeof user>;
// {
//   id: number;
//   name: string;
//   email: string;
//   role: "admin" | "user";
//   tags: string[];
// }

user.safeParse({
  id: 1,
  name: "Ada",
  email: "ada@example.com",
  role: "admin",
  tags: ["fp", "math"],
});
// { success: true, value: { id: 1, name: "Ada", email: "ada@example.com", role: "admin", tags: ["fp", "math"] } }
```

## Parsing

Every schema is callable and exposes four parse modes:

| API | Behavior |
|-----|----------|
| `schema(value)` | Returns the validated value or **throws** `ValidationError` |
| `schema.validate(value)` | Same as calling the schema directly |
| `schema.safeParse(value)` | Returns a `Result` — never throws, **aborts on the first issue** |
| `schema.safeParseAll(value)` | Returns a `Result` and **collects every issue** |
| `schema.is(value)` | Type-guard boolean — `value is Out` |

```ts
import { Validator } from "@panmdaa/validate";

const age = Validator.number().int().min(0).max(120);

age(42);                                  // 42
age(-1);                                  // throws ValidationError

age.safeParse(42);
// { success: true, value: 42 }

age.safeParse(-1);
// { success: false, issues: [{ path: [], message: "Number must be >= 0" }] }

const form = Validator.object({
  name: Validator.string().minLength(3),
  age: Validator.number().min(18),
});

form.safeParseAll({ name: "A", age: 5 });
// { success: false, issues: [
//   { path: ["name"], message: "String must contain at least 3 character(s)" },
//   { path: ["age"], message: "Number must be >= 18" },
// ] }

age.is(30);   // true
age.is("30"); // false
```

`safeParse` stops at the first failing check; `safeParseAll` keeps going across every field and nested schema so you get the full report (each leaf reports its first failing check). See [Error handling](#error-handling) for the shape of `Issue`.

## Primitives

```ts
import { Validator } from "@panmdaa/validate";

Validator.string();          // string
Validator.number();          // number
Validator.boolean();         // boolean
Validator.bigint();          // bigint
Validator.literal("on");     // "on" | 42 | true | 10n | null | undefined
Validator.enum(["a", "b"]);  // "a" | "b" (string | number | boolean values)
Validator.custom<number>((v) => v > 0, "must be positive");
Validator.unknown();         // unknown — accepts anything
Validator.any();             // any — accepts anything
Validator.never();           // never — rejects everything
```

`custom` predicates may return `true`, `false`, or a `string` (used as the error message when falsy). `never` always fails with `"Expected never"`.

### Strings

| Method | Fails when |
|--------|------------|
| `.minLength(n)` | `value.length < n` |
| `.maxLength(n)` | `value.length > n` |
| `.length(n)` | `value.length !== n` |
| `.pattern(re)` | `!re.test(value)` — a `lastIndex = 0` reset makes global/sticky flags safe |
| `.email()` | the value fails the built-in email pattern |
| `.url()` | `new URL(value)` throws |
| `.startsWith(s)` / `.endsWith(s)` / `.includes(s)` | the value doesn't start with / end with / include `s` |

Every check accepts an optional custom message as its last argument.

```ts
const username = Validator.string()
  .minLength(3, "too short")
  .maxLength(20)
  .pattern(/^[a-z0-9_]+$/);

username.safeParse("A");
// { success: false, issues: [{ path: [], message: "too short" }] }
```

### Numbers

| Method | Fails when |
|--------|------------|
| `.int()` | `!Number.isInteger(value)` |
| `.finite()` | `!Number.isFinite(value)` |
| `.safe()` | `!Number.isSafeInteger(value)` |
| `.min(n)` | `value < n` |
| `.max(n)` | `value > n` |
| `.positive()` / `.negative()` | the sign is wrong (`0` fails both) |
| `.nonnegative()` / `.nonpositive()` | `value` crosses zero in the wrong direction |

`NaN` is rejected as a type error, before any check runs.

```ts
const score = Validator.number().min(0).max(100).int();
```

## Objects

`Validator.object(shape)` strips unknown keys by default. Objects are rebuilt (or returned by reference when nothing needs to change) and always validated field by field:

```ts
const point = Validator.object({
  x: Validator.number(),
  y: Validator.number(),
});
```

Three modes control unknown keys:

```ts
Validator.object({ a: Validator.number() });             // strip — unknown keys are dropped
Validator.object({ a: Validator.number() }).passthrough(); // keep unknown keys
Validator.object({ a: Validator.number() }).strict();      // fail on unknown keys
```

In `strip` mode with no transforms, an object that already has exactly the shape keys is returned **by reference** (no allocation).

## Arrays & tuples

```ts
const ids = Validator.array(Validator.number().int()).min(1).max(100);

const pair = Validator.tuple([Validator.string(), Validator.number()]);
// tuple items are validated positionally; length must match exactly
```

`array` supports `.min(n)`, `.max(n)`, and `.length(n)`, each with an optional message.

## Unions

```ts
const id = Validator.union([Validator.string(), Validator.number().int()]);

const entity = Validator.discriminatedUnion("type", {
  user: Validator.object({ type: Validator.literal("user"), name: Validator.string() }),
  admin: Validator.object({ type: Validator.literal("admin"), level: Validator.number() }),
});

entity.safeParse({ type: "user", name: "Ada" });
// { success: true, value: { type: "user", name: "Ada" } }
```

`union` tries each option in order and rolls back issues between attempts. `discriminatedUnion` dispatches on a single tag key — the tag is matched by `String(tag) === tagValue`, so numeric tags work too.

## Records

```ts
const scores = Validator.record(Validator.number().int());
scores.safeParse({ a: 90, b: 85 });
// { success: true, value: { a: 90, b: 85 } }
```

Every own key's value is validated against the value schema; keys pass through unchanged.

## Wrappers

```ts
Validator.string().optional();                      // string | undefined
Validator.string().nullable();                      // string | null
Validator.string().default("fallback");             // fills undefined, lazily if given a function
Validator.string().transform((s) => s.length);      // maps the output
Validator.string().refine((s) => s.startsWith("x")); // extra boolean (or message-string) check
```

Wrappers compose in any order and each one narrows the inferred type:

```ts
const title = Validator.string()
  .optional()
  .default("untitled")
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, "title cannot be empty");

title(undefined);   // "untitled"
title("  hi  ");    // "hi"
```

`default` accepts a thunk, which is evaluated once at compile time. `refine` (like `custom`) may return a `string` to use as the error message.

## Type inference

`Infer` (output), `Input` (input), and `Output` (alias of `Infer`) walk the schema tree:

```ts
import { Validator, type Infer, type Input, type Output } from "@panmdaa/validate";

const schema = Validator.object({
  id: Validator.number().int(),
  email: Validator.string().email(),
  meta: Validator.record(Validator.string()).optional().default({} as Record<string, string>),
});

type Out = Infer<typeof schema>;
// { id: number; email: string; meta: Record<string, string> }
type In = Input<typeof schema>;
// { id: number; email: string; meta: Record<string, string> | undefined }
```

## Error handling

Failed validation produces a `ValidationError` (thrown) or a failed `Result` with an `issues` array:

```ts
interface Issue {
  path: (string | number)[];
  message: string;
  expected?: string;
  received?: string;
}
```

- `path` walks nested schemas (`["user", "address", 0]` for the first item of an array under `user.address`).
- `expected` describes what the schema wanted.
- `received` is a human-readable description of the actual value.

| Received value | `received` description |
|----------------|------------------------|
| `null` | `"null"` |
| an array | `"array"` |
| an object | `"object"` |
| a string | the string itself |
| anything else | `String(value)` |

`received` is omitted when the input is `undefined`.

```ts
import { Validator, ValidationError } from "@panmdaa/validate";

const schema = Validator.object({
  user: Validator.object({ age: Validator.number().int() }),
});

try {
  schema({ user: { age: "x" } });
} catch (error) {
  if (error instanceof ValidationError) {
    error.message; // "Expected number"
    error.issues;  // [{ path: ["user", "age"], message: "Expected number", expected: "number", received: "x" }]
  }
}
```

## API

| Member | Description |
|--------|-------------|
| `Validator.string()` / `number()` / `boolean()` / `bigint()` | Primitive schemas |
| `Validator.literal(v)` | Exact match for `string \| number \| boolean \| bigint \| null \| undefined` |
| `Validator.enum(values)` | One of a fixed list of `string \| number \| boolean` |
| `Validator.custom<T>(fn, message?)` | Arbitrary predicate (`boolean \| string` return) |
| `Validator.unknown()` / `any()` / `never()` | Pass-all / pass-all / fail-all schemas |
| `Validator.object(shape)` | Object schema — `.passthrough()`, `.strip()`, `.strict()` |
| `Validator.array(item)` | Array schema — `.min(n)`, `.max(n)`, `.length(n)` |
| `Validator.tuple(items)` | Fixed-length, positionally validated tuple |
| `Validator.union(options)` | First matching option wins |
| `Validator.discriminatedUnion(key, options)` | Tag-keyed dispatch over object schemas |
| `Validator.record(value)` | Validates every own value against `value` |
| `.optional()` / `.nullable()` | Accept `undefined` / `null` |
| `.default(value \| fn)` | Fill `undefined` with a value (lazily if a function) |
| `.transform(fn)` | Map the output value |
| `.refine(fn, message?)` | Extra boolean (or message-string) check |
| `schema(value)` / `.validate(value)` | Parse or throw `ValidationError` |
| `.safeParse(value)` | `Result`, abort-early |
| `.safeParseAll(value)` | `Result`, collects all issues |
| `.is(value)` | Type guard: `value is Out` |
| `.kind` | Schema kind (e.g. `"string"`, `"object"`, `"refine"`) |
| `Infer<S>` / `Output<S>` | Output type of a schema |
| `Input<S>` | Input type of a schema |
| `ValidationError` | Error with `issues` and `message` |
| `Result<O>` | `{ success: true; value: O } \| { success: false; issues: Issue[] }` |
| `Issue` | `{ path, message, expected?, received? }` |

## Internal architecture

```
src/
├── index.ts        ← root barrel — re-exports core, schemas, Validator
├── validator.ts    ← the Validator namespace (factory functions)
├── core/
│   ├── compile.ts  ← interpreter: compiles a schema node into a RunFn
│   ├── codegen.ts  ← codegen: emits a dedicated function via new Function
│   ├── schema.ts   ← makeCallable — binds parse methods to a node
│   ├── run.ts      ← fail() + describe() — issue construction
│   └── types.ts    ← Schema, Result, Issue, Infer/Input/Output
├── schemas/        ← declarative schema factories (primitive + compound)
└── compilers/      ← runtime backends: leaf checks, compound compilers, wrappers
```

Every schema is a plain node `{ kind, def }`. When a schema is created, `makeCallable` compiles it: it tries the **code generator** (`codegen.ts`), which emits a specialized function with the checks inlined; if generation fails, it falls back to the **interpreter** (`compile.ts`). Both are cached per schema. Leaf nodes (`string`, `number`, `boolean`, `bigint`, `literal`, `enum`, `custom`, `unknown`, `any`, `never`) compile to a single closure reused by both backends.

## Scripts

| `npm run` | Description |
|-----------|-------------|
| `build` | Bundle with tsup (ESM + DTS) and emit declaration types |
| `test` | Run the vitest test suite |
| `test:watch` | Run vitest in watch mode |
| `typecheck` | TypeScript strict check (`tsc --noEmit`) |
| `lint` | Biome lint (`--write`) |
| `format` | Biome format (`--write`) |
| `bench` | Run benchmarks against zod, valibot, arktype, yup and ajv |
| `bench:memory` | Run the memory-allocation benchmark |

---

Full documentation lives in [`docs/`](docs/README.md) — usage, the complete API reference, error handling, type inference, and the architecture behind the library.

---
<p align="center">
  Crafted with ❤️ by the Panmdaa project.
</p>
