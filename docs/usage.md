# Usage

This guide walks through every schema family and how they compose. For the complete list of methods see the [API reference](api.md).

## Building schemas

Schemas are created through the `Validator` namespace. Every factory returns a schema value that is **callable** and exposes chainable methods. Chaining never mutates — each method returns a *new* schema, so definitions are safe to reuse and share.

```ts
import { Validator, type Infer } from "@panmdaa/validate";

const name = Validator.string().minLength(1).maxLength(80);
const isName = Validator.string().minLength(1).maxLength(80);

isName === name; // false — separate schema instances
```

## Parse modes

Every schema supports five entry points.

| API | Returns | Failure behavior |
|-----|---------|------------------|
| `schema(value)` | `Out` | throws `ValidationError` |
| `schema.validate(value)` | `Out` | throws `ValidationError` (same function) |
| `schema.safeParse(value)` | `Result<Out>` | `{ success: false, issues }`, abort-early |
| `schema.safeParseAll(value)` | `Result<Out>` | `{ success: false, issues }`, collects everything |
| `schema.is(value)` | `boolean` | type guard — `value is Out` |

```ts
import { Validator } from "@panmdaa/validate";

const age = Validator.number().int().min(0);

age(30);                      // 30
age.validate(30);             // 30

age.safeParse(30);            // { success: true, value: 30 }
age.safeParse(-1);            // { success: false, issues: [{ path: [], message: "Number must be >= 0" }] }

age.safeParseAll(-1);         // same as above for a single leaf
age.is(30);                   // true
age.is("30");                 // false
```

Notes:

- `safeParse` **aborts at the first failing check**. This is the fast, intended path for "is this valid?".
- `safeParseAll` **keeps going** across fields and nested schemas and returns every issue. Within a single leaf (one string/number/etc. schema), only the **first failing check** is reported.
- `is` is the cheapest check: it never allocates issues and short-circuits via `failFast`.

## Strings

```ts
const username = Validator.string()
  .minLength(3, "too short")
  .maxLength(20)
  .pattern(/^[a-z0-9_]+$/)
  .startsWith("u_");
```

| Check | Default message |
|-------|-----------------|
| `.minLength(n)` | `String must contain at least ${n} character(s)` |
| `.maxLength(n)` | `String must contain at most ${n} character(s)` |
| `.length(n)` | `String must contain exactly ${n} character(s)` |
| `.pattern(re)` | `String must match the pattern ${re}` |
| `.email()` | `Invalid email address` |
| `.url()` | `Invalid URL` |
| `.startsWith(s)` | `String must start with "${s}"` |
| `.endsWith(s)` | `String must end with "${s}"` |
| `.includes(s)` | `String must include "${s}"` |

Every check accepts an optional custom message as the last argument. `pattern` supports global and sticky regexes safely (the engine resets `lastIndex` before each `test`).

## Numbers

```ts
const score = Validator.number()
  .int()
  .min(0)
  .max(100)
  .finite();
```

| Check | Default message |
|-------|-----------------|
| `.int()` | `Expected an integer` |
| `.finite()` | `Expected a finite number` |
| `.safe()` | `Expected a safe integer` |
| `.min(n)` | `Number must be >= ${n}` |
| `.max(n)` | `Number must be <= ${n}` |
| `.positive()` | `Number must be positive` |
| `.negative()` | `Number must be negative` |
| `.nonnegative()` | `Number must be non-negative` |
| `.nonpositive()` | `Number must be non-positive` |

`NaN` is rejected as a type error (`Expected number`) before any check runs, and `0` fails both `positive()` and `negative()`.

## Other primitives

```ts
Validator.boolean();                 // boolean
Validator.bigint();                  // bigint
Validator.literal("on");             // one exact value
Validator.literal(null);
Validator.literal(10n);
Validator.enum(["admin", "user"]);   // one of a list
Validator.custom<number>((v) => v > 0, "must be positive");
Validator.unknown();                 // accepts anything, typed unknown
Validator.any();                     // accepts anything, typed any
Validator.never();                   // rejects everything
```

`literal` accepts `string | number | boolean | bigint | null | undefined` and matches with `===`. `enum` values may be `string | number | boolean`. `custom` predicates return `true`, `false`, or a `string` (a string is used as the error message). `never` always fails with `Expected never`.

## Objects

`Validator.object(shape)` validates each key and controls unknown keys via one of three modes:

```ts
const point = Validator.object({
  x: Validator.number(),
  y: Validator.number(),
});

Validator.object({ a: Validator.number() });              // strip (default) — drops unknowns
Validator.object({ a: Validator.number() }).passthrough(); // keeps unknowns
Validator.object({ a: Validator.number() }).strict();      // fails on unknowns
```

Key behaviors:

- **strip** rebuilds the object with only the declared keys (unknowns dropped).
- **passthrough** validates declared keys and copies unknown keys into the output.
- **strict** fails with `Unexpected key: ${key}` when an undeclared key is present.
- When nothing can change the output — `strip` mode, no transforms anywhere in the shape, every key required, and the input has exactly the declared keys — the **same object reference is returned**, so no allocation happens.

## Arrays and tuples

```ts
const ids = Validator.array(Validator.number().int()).min(1).max(100);
const pair = Validator.tuple([Validator.string(), Validator.number()]);
```

- `array` checks `min`/`max`/`length` on the array itself, then every item. Errors are reported with the numeric index in `path`.
- `tuple` validates the **exact length** and each item **positionally**, so each position can have a different type. A length mismatch fails with `Expected ${n} item(s), got ${m}`.

## Unions

```ts
const id = Validator.union([Validator.string(), Validator.number().int()]);

const entity = Validator.discriminatedUnion("type", {
  user: Validator.object({ type: Validator.literal("user"), name: Validator.string() }),
  admin: Validator.object({ type: Validator.literal("admin"), level: Validator.number() }),
});
```

- `union` tries each option **in order** and rolls back any issues between attempts. If every option fails it reports `Invalid value` with `expected: "union member"`.
- `discriminatedUnion(key, options)` reads the tag from `value[key]` and dispatches by `String(tag)`, so numeric tags work. An unknown tag fails with `Invalid discriminator value for "${key}"`.

## Records

```ts
const scores = Validator.record(Validator.number().int());
scores.safeParse({ a: 90, b: 85 }); // { success: true, value: { a: 90, b: 85 } }
```

Every **own** key's value is validated against the value schema (own-key traversal via `Object.hasOwn`). Keys are preserved as-is.

## Wrappers

```ts
Validator.string().optional();                        // string | undefined
Validator.string().nullable();                        // string | null
Validator.string().default("fallback");               // fill undefined
Validator.string().default(() => "computed");         // lazily-computed default
Validator.string().transform((s) => s.length);        // map the output
Validator.string().refine((s) => s.length > 3);       // extra check after validation
```

- `optional` lets `undefined` through untouched; `nullable` lets `null` through.
- `default` fills `undefined` (only — `null` is still validated). Function values are evaluated **once at compile time**, not per parse.
- `transform` runs after the inner schema succeeds and replaces the output value. It is what triggers output rebuilding in compounds.
- `refine` runs after the inner schema and requires `true`; a returned `string` becomes the error message.

Wrappers compose in any order:

```ts
const title = Validator.string()
  .optional()
  .default("untitled")
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, "title cannot be empty");

title(undefined);  // "untitled"
title("  hi  ");   // "hi"
```

## Composition patterns

Schemas nest arbitrarily — objects inside arrays, arrays of objects, unions of objects, records of tuples:

```ts
const user = Validator.object({
  id: Validator.number().int().positive(),
  profile: Validator.object({
    handle: Validator.string().minLength(3).maxLength(30),
  }),
  tags: Validator.array(Validator.string()).max(10),
  address: Validator.object({
    city: Validator.string(),
    zip: Validator.string().pattern(/^\d{5}$/),
  }).passthrough(),
});

type User = Infer<typeof user>;
```

Because types come from the same definition, `User` is exact and stays in sync with the runtime schema.
