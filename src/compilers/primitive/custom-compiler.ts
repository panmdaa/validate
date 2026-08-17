import type { CustomDef } from "../../schemas/primitive/types";
import { leafRun } from "../leaf";
import type { LeafCheck, NodeCompiler } from "../types";

export function buildCustomCheck(def: CustomDef): LeafCheck {
	return (value) => {
		const outcome = def.fn(value);
		if (outcome === true) return true;
		return { message: typeof outcome === "string" ? outcome : def.message };
	};
}

export const compileCustom: NodeCompiler = (node) =>
	leafRun(buildCustomCheck(node.def as CustomDef));
