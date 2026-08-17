import { fail } from "../../core/run";
import type { RunFn, SchemaNode } from "../../core/types";
import type { NodeCompiler } from "../types";
import type { DiscriminatedUnionCompiler } from "./types";

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface DiscriminatedUnionDef {
	key: string;
	options: Record<string, SchemaNode>;
}

export const compileDiscriminatedUnion: DiscriminatedUnionCompiler = (
	node,
	compile: NodeCompiler,
) => {
	const def = node.def as DiscriminatedUnionDef;
	const branches = new Map<string, RunFn>();
	for (const [tag, schema] of Object.entries(def.options)) {
		branches.set(tag, compile(schema));
	}

	return (value, ctx) => {
		if (!isObject(value)) {
			return fail(ctx, "Expected object", "object", value);
		}
		const tag = value[def.key];
		const run = branches.get(String(tag));
		if (!run) {
			return fail(
				ctx,
				`Invalid discriminator value for "${def.key}"`,
				"known discriminator",
				tag,
			);
		}
		return run(value, ctx);
	};
};
