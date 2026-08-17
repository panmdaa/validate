import type { LiteralDef } from "../../schemas/primitive/types";
import { leafRun } from "../leaf";
import type { LeafCheck, NodeCompiler } from "../types";

export function buildLiteralCheck(def: LiteralDef): LeafCheck {
	return (value) =>
		value === def.value
			? true
			: {
					message: "Invalid literal",
					expected: String(def.value),
					received: value,
				};
}

export const compileLiteral: NodeCompiler = (node) =>
	leafRun(buildLiteralCheck(node.def as LiteralDef));
