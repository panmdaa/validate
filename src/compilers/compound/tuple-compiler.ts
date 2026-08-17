import { FAIL } from "../../core/constants";
import { fail } from "../../core/run";
import type { SchemaNode } from "../../core/types";
import { childPlan } from "../inline";
import type { NodeCompiler } from "../types";
import type { TupleCompiler } from "./types";

interface TupleDef {
	items: readonly SchemaNode[];
}

export const compileTuple: TupleCompiler = (node, compile: NodeCompiler) => {
	const def = node.def as TupleDef;
	const plans = def.items.map((item) => childPlan(item, compile));
	const transforms = plans.some((plan) => plan.transforms);

	return (value, ctx) => {
		if (!Array.isArray(value)) {
			return fail(ctx, "Expected tuple", "array", value);
		}
		if (value.length !== plans.length) {
			return fail(
				ctx,
				`Expected ${plans.length} item(s), got ${value.length}`,
				`${plans.length} item(s)`,
				`${value.length} item(s)`,
			);
		}

		const out = transforms ? new Array(plans.length) : null;
		let ok = true;
		for (let i = 0; i < plans.length; i++) {
			const plan = plans[i];
			const v = value[i];
			if (plan.kind === "test") {
				const result = plan.test(v);
				if (result !== true) {
					if (ctx.collect) {
						ctx.path.push(i);
						ctx.issues.push({
							path: [...ctx.path],
							message: result.message,
						});
						ctx.path.pop();
						ok = false;
						continue;
					}
					ctx.path.push(i);
					fail(ctx, result.message, result.expected, result.received);
					ctx.path.pop();
					return FAIL;
				}
			} else {
				ctx.path.push(i);
				const result = plan.run(v, ctx);
				ctx.path.pop();
				if (result === FAIL) {
					if (!ctx.collect) return FAIL;
					ok = false;
					continue;
				}
				if (out !== null) out[i] = result;
			}
		}
		if (!ok) return FAIL;
		return out ?? value;
	};
};
