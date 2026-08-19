# Security Policy

## Supported Versions

`@panmdaa/validate` is in early development.

Security fixes are guaranteed for:

- the current `main` branch
- the latest published version

Older releases should be considered unsupported unless stated otherwise.

## What To Report

Please report vulnerabilities involving:

- prototype pollution through `object`/`record`/`tuple` schemas (for example, keys such as `__proto__`, `constructor`, or `prototype`)
- denial-of-service vectors (deeply nested or pathologically large inputs that exhaust the stack or memory, unbounded `safeParseAll` reports)
- ReDoS when user-supplied regular expressions are passed to `.pattern()` or reused inside `.custom()` predicates
- type-confusion or logic bugs where an invalid value passes or a valid value fails
- dependency supply-chain issues (though there are zero runtime dependencies)

If you are unsure whether something is security-relevant, report it anyway.

## How To Report

Do **not** open public issues for suspected vulnerabilities.

Report them privately to:

- `is.kkokotero@gmail.com`

When possible, include:

- a clear description of the issue
- affected version or commit
- reproduction steps
- proof of concept or sample code
- expected impact
- suggested remediation

## Response Expectations

The project will try to:

- acknowledge reports within 72 hours
- provide an initial assessment within 7 days when practical
- coordinate a fix before public disclosure

These are goals, not guarantees, especially while the project is small.

## Disclosure

Please allow time for coordinated remediation before disclosing a vulnerability publicly.

Once a fix is available, the project may publish:

- a summary of the issue
- affected scope
- remediation guidance

## Security Design Notes

`@panmdaa/validate` reduces risk by:

- maintaining zero runtime dependencies
- keeping the API surface minimal and predictable
- validating inputs to public functions
- using `Object.hasOwn` for own-key traversal in objects and records
- failing fast on the first issue (`.safeParse`) so adversarial inputs stop early
- treating `undefined` inputs explicitly via `optional`/`default` rather than ambiguous coercion
