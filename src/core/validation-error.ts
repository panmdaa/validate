import type { Issue } from "./types";

export class ValidationError extends Error {
	readonly issues: Issue[];

	constructor(issues: Issue[]) {
		super(issues[0]?.message ?? "Validation failed");
		this.name = "ValidationError";
		this.issues = issues;
	}
}
