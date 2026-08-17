import { FAIL } from "../../core/constants";
import { fail } from "../../core/run";
import type { SchemaNode } from "../../core/types";
import type { ObjectMode } from "../../schemas/compound/types";
import { childPlan } from "../inline";
import type { NodeCompiler } from "../types";
import type { ObjectCompiler } from "./types";

function hasOwn(record: Record<string, unknown>, key: string): boolean {
	return Object.hasOwn(record, key);
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface ObjectDef {
	shape: Record<string, SchemaNode>;
	mode: ObjectMode;
}

export const compileObject: ObjectCompiler = (node, compile: NodeCompiler) => {
	const def = node.def as ObjectDef;
	const keys = Object.keys(def.shape);
	const plans = keys.map(
		(key) => [key, childPlan(def.shape[key], compile)] as const,
	);
	const transforms = plans.some(([, plan]) => plan.transforms);
	const allRequired = keys.every((key) => def.shape[key].kind !== "optional");

	return (value, ctx) => {
		if (!isObject(value)) {
			return fail(ctx, "Expected object", "object", value);
		}

		let identity = !transforms;
		if (identity && def.mode === "strip") {
			identity = allRequired && Object.keys(value).length === keys.length;
		}

		if (def.mode === "strict") {
			for (const key of Object.keys(value)) {
				if (!hasOwn(def.shape, key)) {
					return fail(ctx, `Unexpected key: ${key}`);
				}
			}
		}

		const out: Record<string, unknown> | null = identity ? null : {};
		let ok = true;
		for (const [key, plan] of plans) {
			const v = value[key];
			if (plan.kind === "test") {
				const result = plan.test(v);
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
				if (out !== null) out[key] = v;
			} else {
				ctx.path.push(key);
				const result = plan.run(v, ctx);
				ctx.path.pop();
				if (result === FAIL) {
					if (!ctx.collect) return FAIL;
					ok = false;
					continue;
				}
				if (out !== null) out[key] = result;
			}
		}
		if (!ok) return FAIL;

		if (identity) return value;

		const target = out as Record<string, unknown>;
		if (def.mode === "passthrough") {
			for (const key of Object.keys(value)) {
				if (!hasOwn(def.shape, key)) {
					target[key] = value[key];
				}
			}
		}
		return target;
	};
};
