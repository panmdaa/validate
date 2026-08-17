import { FAIL } from "../../core/constants";
import { fail } from "../../core/run";
import type { SchemaNode } from "../../core/types";
import { childPlan } from "../inline";
import type { NodeCompiler } from "../types";
import type { RecordCompiler } from "./types";

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface RecordDef {
	value: SchemaNode;
}

export const compileRecord: RecordCompiler = (node, compile: NodeCompiler) => {
	const def = node.def as RecordDef;
	const plan = childPlan(def.value, compile);

	return (value, ctx) => {
		if (!isObject(value)) {
			return fail(ctx, "Expected record", "object", value);
		}

		const keys = Object.keys(value);
		if (plan.kind === "test") {
			let ok = true;
			for (const key of keys) {
				const result = plan.test(value[key]);
				if (result !== true) {
					if (ctx.collect) {
						ctx.path.push(key);
						ctx.issues.push({
							path: [...ctx.path],
							message: result.message,
						});
						ctx.path.pop();
						ok = false;
						continue;
					}
					ctx.path.push(key);
					fail(ctx, result.message, result.expected, result.received);
					ctx.path.pop();
					return FAIL;
				}
			}
			return ok ? value : FAIL;
		}

		const out: Record<string, unknown> | null = plan.transforms ? {} : null;
		let ok = true;
		for (const key of keys) {
			ctx.path.push(key);
			const result = plan.run(value[key], ctx);
			ctx.path.pop();
			if (result === FAIL) {
				if (!ctx.collect) return FAIL;
				ok = false;
				continue;
			}
			if (out !== null) out[key] = result;
		}
		if (!ok) return FAIL;
		return out ?? value;
	};
};
