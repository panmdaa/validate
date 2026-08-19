# Type inference

The library derives types from the schema definition itself, so a single schema powers both the runtime check and the compile-time type.

## The core helpers

```ts
type Infer<S>  = S extends Schema<unknown, infer O> ? O : never; // output
type Output<S> = Infer<S>;                                       // alias
type Input<S>  = S extends Schema<infer I, unknown> ? I : never; // input
```

For a `Schema<In, Out>`:

- `Infer` extracts `Out` — the value after validation, transforms, and defaults.
- `Input` extracts `In` — the accepted input (before transforms/defaults).

```ts
import { Validator, type Infer, type Input } from "@panmdaa/validate";

const s = Validator.number().transform((n) => `n=${n}`);
type Out = Infer<typeof s>; // string
type In  = Input<typeof s>; // number
```

## How each schema maps types

### Primitives

`string`, `number`, `boolean`, `bigint` keep their type. `literal(v)` produces the literal type `v`. `enum([...])` produces the union of the value literals.

```ts
const role = Validator.enum(["admin", "user"]);
type Role = Infer<typeof role>; // "admin" | "user"
```

`custom<T>` is `Schema<T, T>`. `unknown`/`any`/`never` map to `unknown`/`any`/`never`.

### Objects

```ts
type ObjectInput<S extends Shape>  = { [K in keyof S]: Input<S[K]> };
type ObjectOutput<S extends Shape> = { [K in keyof S]: Infer<S[K]> };
```

A mapped type over the shape: every key keeps its own schema's `Input`/`Infer`.

```ts
const point = Validator.object({ x: Validator.number(), y: Validator.number() });
type P = Infer<typeof point>; // { x: number; y: number }
```

An optional field is `In | undefined` in both `Input` and `Infer`:

```ts
const user = Validator.object({
  name: Validator.string(),
  bio: Validator.string().optional(),
});
type U = Infer<typeof user>; // { name: string; bio?: string | undefined } — key required, value may be undefined
```

### Arrays

```ts
type ArrayInput<I>  = Input<I>[];
type ArrayOutput<I> = Infer<I>[];
```

### Tuples

```ts
type TupleInput<T>  = { [K in keyof T]: Input<T[K]> };
type TupleOutput<T> = { [K in keyof T]: Infer<T[K]> };
```

The mapped type over the tuple preserves tuple structure, so a heterogeneous tuple keeps heterogeneous element types:

```ts
const pair = Validator.tuple([Validator.string(), Validator.number()]);
type Pair = Infer<typeof pair>; // [string, number]
```

On the API side, `tuple` accepts `items: [...T]` (a variadic tuple spread) so TypeScript infers the argument as a tuple instead of a plain array.

### Unions

```ts
type UnionInput<T>  = Input<T[number]>;
type UnionOutput<T> = Infer<T[number]>;
```

The output is the union of every option's output.

```ts
const id = Validator.union([Validator.string(), Validator.number().int()]);
type Id = Infer<typeof id>; // string | number
```

### Discriminated unions

```ts
type DiscriminatedUnionOutput<K, O> = {
  [T in keyof O]: { [P in K]: T } & Infer<O[T]>;
}[keyof O];
```

Each branch's output is intersected with its tag, giving you the discriminated union shape.

```ts
const entity = Validator.discriminatedUnion("type", {
  user: Validator.object({ type: Validator.literal("user"), name: Validator.string() }),
  admin: Validator.object({ type: Validator.literal("admin"), level: Validator.number() }),
});
type E = Infer<typeof entity>;
// { type: "user"; name: string } | { type: "admin"; level: number }
```

### Records

```ts
Validator.record(v) → Schema<Record<string, Input<V>>, Record<string, Infer<V>>>
```

### Wrappers

| Wrapper | `In` becomes | `Out` becomes |
|---------|--------------|---------------|
| `optional()` | `In \| undefined` | `Out \| undefined` |
| `nullable()` | `In \| null` | `Out \| null` |
| `default(value)` | `In \| undefined` | `D \| Exclude<Out, undefined>` |
| `transform(fn)` | `In` (unchanged) | `O` (the transform's return) |
| `refine(fn)` | `In` (unchanged) | `Out` (unchanged) |

`default` intentionally removes `undefined` from the output: once a default exists, the parsed value can never be `undefined`, which also makes a following `transform` receive a well-typed non-optional value.

```ts
const title = Validator.string().optional().default("untitled").transform((s) => s.trim());
type T = Infer<typeof title>; // string
```

## Putting it together

Use `Infer` to type the outputs of API layers while keeping the schema as the single source of truth:

```ts
import { Validator, type Infer } from "@panmdaa/validate";

export const userSchema = Validator.object({
  id: Validator.number().int().positive(),
  email: Validator.string().email(),
  role: Validator.enum(["admin", "user"]),
  posts: Validator.array(
    Validator.object({
      title: Validator.string().minLength(1),
      likes: Validator.number().int().default(0),
    }),
  ),
});

export type User = Infer<typeof userSchema>;
// {
//   id: number;
//   email: string;
//   role: "admin" | "user";
//   posts: { title: string; likes: number }[];
// }

export function parseUser(input: unknown): User {
  const result = userSchema.safeParse(input);
  if (!result.success) throw new Error(result.issues[0].message);
  return result.value;
}
```
