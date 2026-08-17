import { FAIL } from "./constants";
import type { Issue, RunCtx } from "./types";

function describe(value: unknown): string {
	if (value === null) return "null";
	if (Array.isArray(value)) return "array";
	switch (typeof value) {
		case "string":
			return value;
		case "object":
			return "object";
		default:
			return String(value);
	}
}

export function fail(
	ctx: RunCtx,
	message: string,
	expected?: string,
	received?: unknown,
): typeof FAIL {
	if (ctx.failFast) return FAIL;
	const issue: Issue = { path: [...ctx.path], message };
	if (expected !== undefined) issue.expected = expected;
	if (received !== undefined) issue.received = describe(received);
	ctx.issues.push(issue);
	return FAIL;
}
