# Error handling

Every failure produces a list of `Issue` objects. Depending on the entry point you get them as a thrown `ValidationError` or inside a failed `Result`.

## The `Issue` shape

```ts
interface Issue {
  path: (string | number)[];
  message: string;
  expected?: string;
  received?: string;
}
```

- **`path`** — the location of the failure inside the input. Object keys appear as strings, array/record indexes as numbers. For example `["user", "address", 0, "zip"]` means the `zip` field of the first item of the `address` array under `user`.
- **`message`** — a human-readable reason (see [default messages](#default-messages)).
- **`expected`** — a short description of what the schema wanted (e.g. `"string"`, `"object"`, `"known discriminator"`).
- **`received`** — a human-readable description of the actual value. Omitted when the input is `undefined`.

## `received` descriptions

Values are described with a small, allocation-free mapping:

| Input | `received` |
|-------|------------|
| `null` | `"null"` |
| array | `"array"` |
| plain object (or `Date` etc.) | `"object"` |
| string | the string itself |
| anything else | `String(value)` |

```ts
import { Validator } from "@panmdaa/validate";

Validator.string().safeParse(42).issues[0].received;     // "42"
Validator.string().safeParse(true).issues[0].received;   // "true"
Validator.string().safeParse(null).issues[0].received;   // "null"
Validator.string().safeParse([]).issues[0].received;     // "array"
Validator.string().safeParse("x").issues[0]?.received;   // "x" (won't happen — it validates)
```

## Abort-early vs collect-all

- `safeParse` stops at the **first** failing check and returns a single-issue report.
- `safeParseAll` keeps validating every field, item, and nested schema and returns **all** issues.

```ts
const form = Validator.object({
  name: Validator.string().minLength(3),
  age: Validator.number().min(18),
});

form.safeParse({ name: "A", age: 5 });
// { success: false, issues: [
//   { path: ["name"], message: "String must contain at least 3 character(s)" },
// ] }

form.safeParseAll({ name: "A", age: 5 });
// { success: false, issues: [
//   { path: ["name"], message: "String must contain at least 3 character(s)" },
//   { path: ["age"], message: "Number must be >= 18" },
// ] }
```

Within a **single leaf** (one string, number, etc. schema), only the first failing check is reported even in collect mode — the leaf returns one result.

## Throwing

Calling a schema directly (or `.validate`) throws `ValidationError` on the first failure:

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

`ValidationError.message` is `issues[0].message` (or `"Validation failed"` when there are no issues), and `error.name === "ValidationError"`.

## Default messages

These are the built-in messages; every check that accepts one lets you override it with a custom message argument.

| Kind | Message |
|------|---------|
| string type | `Expected string` |
| number type | `Expected number` |
| boolean type | `Expected boolean` |
| bigint type | `Expected bigint` |
| literal | `Invalid literal` |
| enum | `Invalid enum value` |
| never | `Expected never` |
| object type | `Expected object` |
| object strict | `Unexpected key: ${key}` |
| array type | `Expected array` |
| tuple type | `Expected tuple` |
| tuple length | `Expected ${n} item(s), got ${m}` |
| union | `Invalid value` |
| discriminated union | `Invalid discriminator value for "${key}"` |
| record type | `Expected record` |
| custom | the custom message, else `Invalid value` |
| refine | the refine message, else `Invalid value` |
| `pattern` | `String must match the pattern ${re}` |
| `min`/`max` on number | `Number must be >= ${n}` / `Number must be <= ${n}` |
| `int`/`finite`/`safe` | `Expected an integer` / `Expected a finite number` / `Expected a safe integer` |
