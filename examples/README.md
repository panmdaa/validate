# Examples

Each file is a self-contained piece of real-world usage, importing `@panmdaa/validate` the same way a consumer of the published package would.

## Running them

The package's `exports` field resolves `@panmdaa/validate` to the built output (`dist/`), which is gitignored, so build once before running:

```sh
npm run build
```

Node 23.6+ runs TypeScript directly via type stripping, so an example can be executed as-is:

```sh
node examples/basic.ts
```

Examples that only export functions (the ones under `api/`, `forms/`, `config/`, `domain/`, `types/`) have no top-level side effects; import them from your own script after building.