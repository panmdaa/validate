import { leafRun } from "../leaf";
import type { LeafCheck, LeafIssue, NodeCompiler } from "../types";

function notBoolean(value: unknown): LeafIssue {
	return { message: "Expected boolean", expected: "boolean", received: value };
}

export function buildBooleanCheck(): LeafCheck {
	return (value) => (typeof value === "boolean" ? true : notBoolean(value));
}

export const compileBoolean: NodeCompiler = (_node) =>
	leafRun(buildBooleanCheck());
