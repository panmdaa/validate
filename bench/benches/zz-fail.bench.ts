import { bench, describe } from "vitest";
import { Validator } from "../../src/index";
import { codegenRun } from "../../src/core/codegen";
import { FAIL } from "../../src/core/constants";

const panObject = Validator.object({
	name: Validator.string().minLength(3),
	age: Validator.number().min(0).max(120),
});
const bad = { name: 123, age: "x" };
const good = { name: "Ada Lovelace", age: 36 };

const run = codegenRun({
	kind: "object",
	def: {
		shape: {
			name: {
				kind: "string",
				def: { checks: [{ type: "minLength", n: 3, message: "too short" }] },
			},
			age: {
				kind: "number",
				def: { checks: [{ type: "min", n: 0, message: "low" }, { type: "max", n: 120, message: "high" }] },
			},
		},
		required: ["name", "age"],
		allRequired: true,
		strip: true,
		allowUnknown: false,
	},
});

function freshCtx(value) {
	const ctx = { path: [], issues: [], collect: false };
	const result = run(value, ctx);
	if (result === FAIL) return { success: false, issues: ctx.issues };
	return { success: true, value: result };
}

const shared = { path: [], issues: [], collect: false, depth: 0 };
function sharedCtx(value) {
	if (shared.depth === 0) {
		shared.depth++;
		shared.path.length = 0;
		shared.issues.length = 0;
		const result = run(value, shared);
		shared.depth--;
		if (result === FAIL) return { success: false, issues: shared.issues };
		return { success: true, value: result };
	}
	const ctx = { path: [], issues: [], collect: false };
	const result = run(value, ctx);
	if (result === FAIL) return { success: false, issues: ctx.issues };
	return { success: true, value: result };
}

describe("fail path isolation", () => {
	bench("fresh ctx fail", () => {
		freshCtx(bad);
	});
	bench("shared ctx fail", () => {
		sharedCtx(bad);
	});
	bench("fresh ctx ok", () => {
		freshCtx(good);
	});
	bench("shared ctx ok", () => {
		sharedCtx(good);
	});
	bench("panObject.safeParse (full)", () => {
		panObject.safeParse(bad);
	});
});