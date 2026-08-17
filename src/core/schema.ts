import { codegenRun } from "./codegen";
import { compile } from "./compile";
import { FAIL } from "./constants";
import type { Result, RunCtx, Schema, SchemaNode } from "./types";
import { ValidationError } from "./validation-error";

function makeCallable<In, Out>(node: SchemaNode): Schema<In, Out> {
	const collectRun = compile(node);
	let run: (value: unknown, ctx: RunCtx) => unknown;
	try {
		run = codegenRun(node);
	} catch {
		run = collectRun;
	}
	let schema: Schema<In, Out>;
	const base = ((value: unknown): Out => {
		const ctx: RunCtx = { path: [], issues: [], collect: false };
		const result = run(value, ctx);
		if (result === FAIL) {
			throw new ValidationError(ctx.issues);
		}
		return result as Out;
	}) as (value: unknown) => Out;

	Object.assign(base, {
		kind: node.kind,
		def: node.def,
		is: (value: unknown): value is Out => {
			const ctx: RunCtx = {
				path: [],
				issues: [],
				collect: false,
				failFast: true,
			};
			return run(value, ctx) !== FAIL;
		},
		safeParse: (value: unknown): Result<Out> => {
			const ctx: RunCtx = { path: [], issues: [], collect: false };
			const result = run(value, ctx);
			if (result === FAIL) {
				return { success: false, issues: ctx.issues };
			}
			return { success: true, value: result as Out };
		},
		safeParseAll: (value: unknown): Result<Out> => {
			const ctx: RunCtx = { path: [], issues: [], collect: true };
			const result = collectRun(value, ctx);
			if (result === FAIL) {
				return { success: false, issues: ctx.issues };
			}
			return { success: true, value: result as Out };
		},
		validate: base,
		optional: (): Schema<In | undefined, Out | undefined> =>
			makeCallable<In | undefined, Out | undefined>({
				kind: "optional",
				def: { inner: schema },
			}),
		nullable: (): Schema<In | null, Out | null> =>
			makeCallable<In | null, Out | null>({
				kind: "nullable",
				def: { inner: schema },
			}),
		default: <D>(value: D): Schema<In | undefined, Out | D> =>
			makeCallable<In | undefined, Out | D>({
				kind: "default",
				def: { inner: schema, value },
			}),
		transform: <O>(fn: (value: Out) => O): Schema<In, O> =>
			makeCallable<In, O>({
				kind: "transform",
				def: { inner: schema, fn },
			}),
		refine: (
			fn: (value: Out) => boolean | string,
			message = "Invalid value",
		): Schema<In, Out> =>
			makeCallable<In, Out>({
				kind: "refine",
				def: { inner: schema, fn, message },
			}),
	});

	schema = base as unknown as Schema<In, Out>;
	return schema;
}

export function createSchema<In = unknown, Out = unknown>(
	kind: string,
	def: unknown,
): Schema<In, Out> {
	return makeCallable<In, Out>({ kind, def });
}

export function withMethods<In, Out>(
	schema: Schema<In, Out>,
	methods: Record<string, unknown>,
): Schema<In, Out> {
	if ("length" in methods) {
		Object.defineProperty(schema, "length", {
			value: methods.length,
			writable: false,
			enumerable: false,
			configurable: false,
		});
		delete methods.length;
	}
	Object.assign(schema, methods);
	return schema;
}
