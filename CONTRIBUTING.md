# Contributing to @panmdaa/validate

Thank you for considering contributing to `@panmdaa/validate`.

`@panmdaa/validate` is a zero-dependency TypeScript validation library: chain-style schemas, lazy compilation, abort-early parsing, and compile-time type inference. It ships as pure ESM and is tree-shakeable. Contributions that improve correctness, performance, documentation, tests, and API clarity are welcome.

## Repository Layout

- `src/` — source, organized in three layers: `schemas/` (declarative schema factories), `compilers/` (runtime backends), and `core/` (compilation, codegen, and shared types).
- `test/` — vitest test suite (primitives, strings, numbers, compounds, wrappers, errors, type inference).
- `bench/` — benchmarks against zod, valibot, arktype, yup and ajv.
- `misc/` — branding assets (banner).

The package exposes a single entry point — `@panmdaa/validate` — which re-exports the core types, the schema factories, and the `Validator` namespace.

## Ways To Contribute

- reporting bugs or regressions in library behavior
- improving documentation, README, or examples
- adding tests for edge cases and public API behavior
- optimizing hot paths or reducing allocation
- proposing API improvements aligned with the project's design goals

## Before You Start

For small fixes, open a pull request directly.

For larger changes, open an issue first so we can align on scope, API design, and compatibility impact.

Changes that should usually be discussed first:

- new public exports or schema kinds
- changes to the compiler or codegen backends
- changes to public function signatures or inferred types
- adding runtime dependencies
- breaking changes to public API or output

## Local Setup

```bash
npm install
```

Useful commands during development:

```bash
npm run typecheck
npm test
npm run lint
npm run format
npm run build
```

If you touch performance-sensitive code, run the benchmark suite to check for regressions:

```bash
npm run bench          # comparisons against other validation libraries
npm run bench:memory   # allocation counts
```

## Contribution Guidelines

- Use English for code, comments, issues, and pull requests.
- Keep the public API minimal and predictable.
- Zero runtime dependencies is a hard constraint.
- Avoid breaking changes unless clearly justified and documented.
- Add or update tests when changing behavior or public API.
- Update documentation when public behavior or output changes.
- Preserve existing naming conventions and import patterns.
- Keep the `Validator` namespace as the single factory entry point for users.

## Code Style

- Use strict TypeScript with explicit return types on public API functions.
- Prefer readable, explicit code over clever abstractions.
- Keep modules focused: each file should have a single clear responsibility.
- Preserve the existing file structure under `src/` (`schemas` / `compilers` / `core`).
- Performance-sensitive paths should avoid unnecessary allocation.
- Formatting and linting are enforced by [Biome](https://biomejs.dev/); run `npm run lint` and `npm run format` before pushing.
- Use tabs for indentation and double quotes for strings (repo convention).

## Pull Request Checklist

Before opening a PR, make sure:

- `npm run typecheck` passes
- `npm test` passes
- new behavior is covered by tests
- docs are updated when public API or behavior changes
- breaking changes or migration notes are called out clearly
- if performance-sensitive, benchmark results are included

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/). Scope the change when it touches a subsystem:

```
feat: add safeParseAll error collection
fix(codegen): keep tuple inference for heterogeneous items
perf(compilers): avoid allocation in object identity fast path
docs: document object strip/passthrough/strict modes
```

## Review Expectations

Reviews focus on:

- correctness of behavior and edge cases
- API clarity and consistency
- backward compatibility
- documentation quality
- test coverage
- maintainability
- performance in hot paths

Feedback is meant to improve the project. Questions, iterations, and design discussion are welcome.

## Need Help?

If you are unsure whether an idea fits `@panmdaa/validate`, open an issue and describe:

- the use case
- the proposed API or behavior
- alternatives you considered
- compatibility or performance concerns
