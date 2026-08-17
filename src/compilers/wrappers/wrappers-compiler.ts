import { FAIL } from "../../core/constants";
import { fail } from "../../core/run";
import type { RunFn, SchemaNode } from "../../core/types";
import type { NodeCompiler } from "../types";

interface WrapperDef {
	inner: SchemaNode;
}

interface DefaultDef extends WrapperDef {
	value: unknown;
}

interface TransformDef extends WrapperDef {
	fn: (value: unknown) => unknown;
}

interface RefineDef extends WrapperDef {
	fn: (value: unknown) => boolean | string;
	message: string;
}

export function compileOptional(
	node: SchemaNode,
	compile: NodeCompiler,
): RunFn {
	const inner = compile((node.def as WrapperDef).inner);
	return (value, ctx) => {
		if (value === undefined) return value;
		return inner(value, ctx);
	};
}

export function compileNullable(
	node: SchemaNode,
	compile: NodeCompiler,
): RunFn {
	const inner = compile((node.def as WrapperDef).inner);
	return (value, ctx) => {
		if (value === null) return value;
		return inner(value, ctx);
	};
}

export function compileDefault(node: SchemaNode, compile: NodeCompiler): RunFn {
	const def = node.def as DefaultDef;
	const inner = compile(def.inner);
	const fallback =
		typeof def.value === "function"
			? (def.value as () => unknown)()
			: def.value;
	return (v, ctx) => {
		if (v === undefined) return fallback;
		return inner(v, ctx);
	};
}

export function compileTransform(
	node: SchemaNode,
	compile: NodeCompiler,
): RunFn {
	const def = node.def as TransformDef;
	const inner = compile(def.inner);
	return (value, ctx) => {
		const result = inner(value, ctx);
		if (result === FAIL) return FAIL;
		return def.fn(result);
	};
}

export function compileRefine(node: SchemaNode, compile: NodeCompiler): RunFn {
	const def = node.def as RefineDef;
	const inner = compile(def.inner);
	return (value, ctx) => {
		const result = inner(value, ctx);
		if (result === FAIL) return FAIL;
		const outcome = def.fn(result);
		if (outcome === true) return result;
		return fail(ctx, typeof outcome === "string" ? outcome : def.message);
	};
}
