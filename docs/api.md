# API reference

Complete public surface of `@panmdaa/validate`. Everything is exported from the package root.

## `Validator` namespace

Factory functions that build schemas.

| Factory | Returns | Notes |
|---------|---------|-------|
| `Validator.string()` | `StringSchema` | `string` in/out |
| `Validator.number()` | `NumberSchema` | `number` in/out |
| `Validator.boolean()` | `Schema<boolean, boolean>` | |
| `Validator.bigint()` | `Schema<bigint, bigint>` | |
| `Validator.literal(v)` | `Schema<T, T>` | `v: string \| number \| boolean \| bigint \| null \| undefined` |
| `Validator.enum(values)` | `Schema<Enum, Enum>` | `values: readonly (string \| number \| boolean)[]` |
| `Validator.custom<T>(fn, message?)` | `Schema<T, T>` | `fn: (value: T) => boolean \| string` |
| `Validator.unknown()` | `Schema<unknown, unknown>` | passes everything |
| `Validator.any()` | `Schema<any, any>` | passes everything |
| `Validator.never()` | `Schema<never, never>` | fails everything |
| `Validator.object(shape)` | `ObjectSchema<S>` | `shape: Record<string, Schema>` |
| `Validator.array(item)` | `ArraySchema<I>` | |
| `Validator.tuple(items)` | `Schema<TupleInput, TupleOutput>` | `items` is a tuple of schemas |
| `Validator.union(options)` | `Schema<UnionInput, UnionOutput>` | first matching option wins |
| `Validator.discriminatedUnion(key, options)` | `Schema<…>` | tag-key dispatch over object schemas |
| `Validator.record(value)` | `Schema<Record<string, Input>, Record<string, Infer>>` | |

## Schema methods (shared by every schema)

```ts
interface Schema<In, Out> {
  (value: unknown): Out;
  readonly kind: string;
  readonly def: unknown;

  is(value: unknown): value is Out;
  safeParse(value: unknown): Result<Out>;
  safeParseAll(value: unknown): Result<Out>;
  validate(value: unknown): Out;

  optional(): Schema<In | undefined, Out | undefined>;
  nullable(): Schema<In | null, Out | null>;
  default<D>(value: D): Schema<In | undefined, D | Exclude<Out, undefined>>;
  transform<O>(fn: (value: Out) => O): Schema<In, O>;
  refine(fn: (value: Out) => boolean | string, message?: string): Schema<In, Out>;
}
```

`kind` exposes the node kind as a string — `"string"`, `"number"`, `"object"`, `"transform"`, `"refine"`, and so on. `def` is the internal (untyped) definition.

## `StringSchema`

```ts
interface StringSchema extends Schema<string, string> {
  minLength(n: number, message?: string): StringSchema;
  maxLength(n: number, message?: string): StringSchema;
  length(n: number, message?: string): StringSchema;
  pattern(re: RegExp, message?: string): StringSchema;
  email(message?: string): StringSchema;
  url(message?: string): StringSchema;
  startsWith(s: string, message?: string): StringSchema;
  endsWith(s: string, message?: string): StringSchema;
  includes(s: string, message?: string): StringSchema;
}
```

## `NumberSchema`

```ts
interface NumberSchema extends Schema<number, number> {
  int(message?: string): NumberSchema;
  finite(message?: string): NumberSchema;
  safe(message?: string): NumberSchema;
  min(n: number, message?: string): NumberSchema;
  max(n: number, message?: string): NumberSchema;
  positive(message?: string): NumberSchema;
  negative(message?: string): NumberSchema;
  nonnegative(message?: string): NumberSchema;
  nonpositive(message?: string): NumberSchema;
}
```

## `ArraySchema`

```ts
interface ArraySchema<I extends Schema> extends Schema<Input<I>[], Infer<I>[]> {
  min(n: number, message?: string): ArraySchema<I>;
  max(n: number, message?: string): ArraySchema<I>;
  length(n: number, message?: string): ArraySchema<I>;
}
```

## `ObjectSchema`

```ts
interface ObjectSchema<S extends Shape> extends Schema<ObjectInput<S>, ObjectOutput<S>> {
  passthrough(): ObjectSchema<S>;
  strip(): ObjectSchema<S>;
  strict(): ObjectSchema<S>;
}
```

The default mode is `strip`. `passthrough`, `strip`, and `strict` return a *new* schema with the same shape.

## Types

```ts
type Result<O> =
  | { success: true; value: O }
  | { success: false; issues: Issue[] };

interface Issue {
  path: (string | number)[];
  message: string;
  expected?: string;
  received?: string;
}

type Infer<S>  = S extends Schema<unknown, infer O> ? O : never;
type Output<S> = Infer<S>;
type Input<S>  = S extends Schema<infer I, unknown> ? I : never;
```

### `ValidationError`

Thrown by calling a schema (or `.validate`) on invalid input.

```ts
class ValidationError extends Error {
  readonly issues: Issue[];
  // message defaults to issues[0].message ?? "Validation failed"
}
```

### `createSchema`

Low-level escape hatch that builds a callable schema from a node.

```ts
function createSchema<In = unknown, Out = unknown>(kind: string, def: unknown): Schema<In, Out>;
```

## Behavior notes

- **`optional` only affects `undefined`**; `null` still fails. `nullable` is the symmetric wrapper for `null`.
- **`default` only fills `undefined`** and takes a lazy thunk. After a default, the output type is `D | Exclude<Out, undefined>` — a defaulted value is never `undefined`.
- **`enum` and `literal` use strict equality**; no coercion happens anywhere.
- **`transform` output is `O`** and `Input` stays `In`; transformations are output-only.
- **`refine` keeps `In`/`Out` unchanged**; it only adds a predicate.
- **`safeParseAll` collects across structure**, but a single leaf reports only its first failing check.
- **Object identity**: in `strip` mode with no transforms, all-required keys, and an exact key match, the input reference is returned unchanged (no allocation). Any transform anywhere in the shape forces a rebuild.
