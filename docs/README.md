# @panmdaa/validate — Documentation

Everything about the library: how to use it, what the API surface is, how errors and types behave, and the internal architecture behind it.

## Reading order

| Guide | What it covers |
|-------|----------------|
| [Usage](usage.md) | Getting started: parse modes, every schema family, composition patterns |
| [API reference](api.md) | Full public surface — `Validator` factories, schema methods, and exported types |
| [Error handling](errors.md) | `Issue` shape, path reporting, `received` descriptions, default messages |
| [Type inference](types.md) | How `Infer`, `Input`, and `Output` derive types from schemas |
| [Architecture](architecture.md) | How the library is built and why — the design behind the two backends |

## Quick facts

- **Package**: `@panmdaa/validate` — pure ESM, Node `>= 18`, zero runtime dependencies.
- **Model**: a schema is a plain node `{ kind, def }` plus bound parse methods. Chaining returns new schemas; nothing is mutated.
- **Two backends**: every schema is compiled once. A code generator (`new Function`) emits a specialized validator; if generation ever fails, the interpreter takes over.
- **Two parse strategies**: `safeParse` aborts on the first issue, `safeParseAll` collects issues across every field and nested schema.
- **Types and runtime share one definition**: `Infer`/`Input`/`Output` read the same schema tree used at runtime.
- **Design goals**: minimal API, no dependencies, fast hot paths, tree-shakeable output.

```
npm install @panmdaa/validate
```
