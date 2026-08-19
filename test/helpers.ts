import type { Issue, Result } from "../src/index";

export function firstIssue<O>(result: Result<O>): Issue | undefined {
	return result.success ? undefined : result.issues[0];
}