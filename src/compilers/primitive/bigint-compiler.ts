import { leafRun } from "../leaf";
import type { LeafCheck, LeafIssue, NodeCompiler } from "../types";

function notBigInt(value: unknown): LeafIssue {
	return { message: "Expected bigint", expected: "bigint", received: value };
}

export function buildBigIntCheck(): LeafCheck {
	return (value) => (typeof value === "bigint" ? true : notBigInt(value));
}

export const compileBigInt: NodeCompiler = (_node) =>
	leafRun(buildBigIntCheck());
