import { FAIL } from "../../core/constants";
import { fail } from "../../core/run";
import type { SchemaNode } from "../../core/types";
import { childPlan } from "../inline";
import type { NodeCompiler } from "../types";
import type { UnionCompiler } from "./types";

interface UnionDef {
	options: readonly SchemaNode[];
}

export const compileUnion: UnionCompiler = (node, compile: NodeCompiler) => {
	const def = node.def as UnionDef;
	const plans = def.options.map((option) => childPlan(option, compile));

	return (value, ctx) => {
		for (let i = 0; i < plans.length; i++) {
			const plan = plans[i];
			const issuesAtEntry = ctx.issues.length;
			let result: unknown;
			if (plan.kind === "test") {
				if (plan.test(value) === true) return value;
				result = FAIL;
			} else {
				result = plan.run(value, ctx);
			}
			if (result !== FAIL) return result;
			ctx.issues.length = issuesAtEntry;
		}
		return fail(ctx, "Invalid value", "union member", value);
	};
};
