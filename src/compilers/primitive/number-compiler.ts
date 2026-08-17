import type { NumberCheck, NumberDef } from "../../schemas/primitive/types";
import { leafRun } from "../leaf";
import type { LeafCheck, LeafIssue, NodeCompiler } from "../types";

function check(c: NumberCheck): (value: number) => boolean {
	switch (c.type) {
		case "int":
			return (v) => Number.isInteger(v);
		case "finite":
			return (v) => Number.isFinite(v);
		case "safe":
			return (v) => Number.isSafeInteger(v);
		case "min":
			return (v) => v >= c.n;
		case "max":
			return (v) => v <= c.n;
		case "positive":
			return (v) => v > 0;
		case "negative":
			return (v) => v < 0;
		case "nonnegative":
			return (v) => v >= 0;
		case "nonpositive":
			return (v) => v <= 0;
	}
}

function notNumber(value: unknown): LeafIssue {
	return { message: "Expected number", expected: "number", received: value };
}

export function buildNumberCheck(def: NumberDef): LeafCheck {
	const checks = def.checks.map(check);
	return (value) => {
		if (typeof value !== "number" || Number.isNaN(value)) {
			return notNumber(value);
		}
		for (let i = 0; i < checks.length; i++) {
			if (!checks[i](value)) {
				return { message: def.checks[i].message };
			}
		}
		return true;
	};
}

export const compileNumber: NodeCompiler = (node) =>
	leafRun(buildNumberCheck(node.def as NumberDef));
