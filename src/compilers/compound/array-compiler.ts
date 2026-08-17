import { FAIL } from "../../core/constants";
import { fail } from "../../core/run";
import type { SchemaNode } from "../../core/types";
import type { ArrayCheck } from "../../schemas/compound/types";
import { childPlan } from "../inline";
import type { NodeCompiler } from "../types";
import type { ArrayCompiler } from "./types";

function check(c: ArrayCheck): (value: unknown[]) => boolean {
	switch (c.type) {
		case "min":
			return (v) => v.length >= c.n;
		case "max":
			return (v) => v.length <= c.n;
		case "length":
			return (v) => v.length === c.n;
	}
}

interface ArrayDef {
	item: SchemaNode;
	checks: ArrayCheck[];
}

export const compileArray: ArrayCompiler = (node, compile: NodeCompiler) => {
	const def = node.def as ArrayDef;
	const plan = childPlan(def.item, compile);
	const checks = def.checks.map(check);

	return (value, ctx) => {
		if (!Array.isArray(value)) {
			return fail(ctx, "Expected array", "array", value);
		}
		for (let i = 0; i < checks.length; i++) {
			if (!checks[i](value)) {
				return fail(ctx, def.checks[i].message);
			}
		}

		if (plan.kind === "test") {
			let ok = true;
			for (let i = 0; i < value.length; i++) {
				const result = plan.test(value[i]);
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
			}
			return ok ? value : FAIL;
		}

		const out: unknown[] | null = plan.transforms ? [] : null;
		let ok = true;
		for (let i = 0; i < value.length; i++) {
			ctx.path.push(i);
			const result = plan.run(value[i], ctx);
			ctx.path.pop();
			if (result === FAIL) {
				if (!ctx.collect) return FAIL;
				ok = false;
				continue;
			}
			if (out !== null) out[i] = result;
		}
		if (!ok) return FAIL;
		return out ?? value;
	};
};
