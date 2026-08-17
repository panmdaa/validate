import type { EnumDef } from "../../schemas/primitive/types";
import { leafRun } from "../leaf";
import type { LeafCheck, LeafIssue, NodeCompiler } from "../types";

function invalidEnum(value: unknown): LeafIssue {
	return {
		message: "Invalid enum value",
		expected: "enum value",
		received: value,
	};
}

export function buildEnumCheck(def: EnumDef): LeafCheck {
	const set = new Set(def.values);
	return (value) => {
		if (
			typeof value !== "string" &&
			typeof value !== "number" &&
			typeof value !== "boolean"
		) {
			return invalidEnum(value);
		}
		return set.has(value) ? true : invalidEnum(value);
	};
}

export const compileEnum: NodeCompiler = (node) =>
	leafRun(buildEnumCheck(node.def as EnumDef));
