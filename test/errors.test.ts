import { describe, expect, it } from "vitest";
import { ValidationError, Validator } from "../src/index";

describe("safeParse results", () => {
	it("returns the parsed value on success", () => {
		expect(Validator.string().safeParse("ok")).toEqual({
			success: true,
			value: "ok",
		});
	});

	it("keeps reference identity for untransformed values", () => {
		const input = { name: "x" };
		const result = Validator.object({ name: Validator.string() }).safeParse(
			input,
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value).toBe(input);
		}
	});

	it("returns a single issue on the first failure", () => {
		const result = Validator.number().safeParse("x");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].path).toEqual([]);
			expect(result.issues[0].message).toBe("Expected number");
			expect(result.issues[0].expected).toBe("number");
			expect(result.issues[0].received).toBe("x");
		}
	});

	it("aborts at the first failure", () => {
		const schema = Validator.object({ a: Validator.number(), b: Validator.number() });
		const result = schema.safeParse({ a: "x", b: "y" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].path).toEqual(["a"]);
		}
	});
});

describe("safeParseAll results", () => {
	it("collects every issue", () => {
		const schema = Validator.object({ a: Validator.number(), b: Validator.number() });
		const result = schema.safeParseAll({ a: "x", b: "y" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues).toEqual([
				{ path: ["a"], message: "Expected number" },
				{ path: ["b"], message: "Expected number" },
			]);
		}
	});

	it("collects array element issues", () => {
		const result = Validator.array(Validator.number()).safeParseAll([
			1,
			"x",
			"y",
			4,
		]);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues.map((i) => i.path)).toEqual([[1], [2]]);
		}
	});

	it("returns success with all values when nothing fails", () => {
		const result = Validator.array(Validator.number()).safeParseAll([1, 2]);
		expect(result).toEqual({ success: true, value: [1, 2] });
	});

	it("collects tuple element issues", () => {
		const schema = Validator.tuple([
			Validator.number(),
			Validator.string(),
			Validator.boolean(),
		]);
		const result = schema.safeParseAll(["x", 1, "y"]);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues.map((i) => i.path)).toEqual([[0], [1], [2]]);
		}
	});

	it("collects record value issues", () => {
		const result = Validator.record(Validator.number()).safeParseAll({
			a: 1,
			b: "x",
			c: "y",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues.map((i) => i.path)).toEqual([["b"], ["c"]]);
		}
	});

	it("collects issues from run-plan children", () => {
		const schema = Validator.array(Validator.object({ x: Validator.number() }));
		const result = schema.safeParseAll([{ x: "a" }, { x: "b" }]);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues).toEqual([
				{ path: [0, "x"], message: "Expected number" },
				{ path: [1, "x"], message: "Expected number" },
			]);
		}
	});

	it("deduplicates union backtracking in collect mode", () => {
		const schema = Validator.union([Validator.string(), Validator.number()]);
		const result = schema.safeParseAll(true);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues).toEqual([
				{
					path: [],
					message: "Invalid value",
					expected: "union member",
					received: "true",
				},
			]);
		}
	});
});

describe("validate throws ValidationError", () => {
	it("throws on failure", () => {
		expect(() => Validator.string().validate(1)).toThrowError(
			"Expected string",
		);
	});

	it("throws a ValidationError instance", () => {
		try {
			Validator.string().validate(1);
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ValidationError);
			const e = error as ValidationError;
			expect(e.name).toBe("ValidationError");
			expect(e.message).toBe("Expected string");
			expect(e.issues).toHaveLength(1);
			expect(e.issues[0]).toEqual({
				path: [],
				message: "Expected string",
				expected: "string",
				received: "1",
			});
		}
	});

	it("is callable directly and throws the same error", () => {
		const schema = Validator.object({ a: Validator.number() });
		expect(() => schema({ a: "x" })).toThrow(ValidationError);
	});

	it("does not throw on success", () => {
		expect(Validator.number().validate(5)).toBe(5);
	});
});

describe("issue received descriptions", () => {
	it("describes primitive values", () => {
		expect(Validator.string().safeParse(42).issues?.[0]?.received).toBe("42");
		expect(Validator.string().safeParse(-1).issues?.[0]?.received).toBe("-1");
		expect(Validator.string().safeParse(1.5).issues?.[0]?.received).toBe("1.5");
		expect(Validator.string().safeParse(true).issues?.[0]?.received).toBe(
			"true",
		);
		expect(Validator.string().safeParse(false).issues?.[0]?.received).toBe(
			"false",
		);
		expect(Validator.string().safeParse(null).issues?.[0]?.received).toBe(
			"null",
		);
		expect(Validator.string().safeParse(10n).issues?.[0]?.received).toBe("10");
		expect(Validator.string().safeParse(NaN).issues?.[0]?.received).toBe("NaN");
	});

	it("omits received when the input is undefined", () => {
		expect(Validator.string().safeParse(undefined).issues?.[0]?.received).toBeUndefined();
	});

	it("describes compound values", () => {
		expect(Validator.string().safeParse([]).issues?.[0]?.received).toBe(
			"array",
		);
		expect(Validator.string().safeParse({}).issues?.[0]?.received).toBe(
			"object",
		);
		expect(
			Validator.string().safeParse(new Date()).issues?.[0]?.received,
		).toBe("object");
	});

	it("uses the string itself for strings", () => {
		expect(Validator.number().safeParse("hello").issues?.[0]?.received).toBe(
			"hello",
		);
	});
});

describe("error paths", () => {
	it("reports paths through object, array and record", () => {
		const schema = Validator.object({
			users: Validator.array(
				Validator.object({ id: Validator.number() }),
			),
		});
		const result = schema.safeParse({ users: [{ id: "x" }] });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual(["users", 0, "id"]);
		}
	});

	it("reports paths inside tuples", () => {
		const schema = Validator.tuple([Validator.string(), Validator.number()]);
		const result = schema.safeParse([1, 2]);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual([0]);
		}
	});

	it("reports paths inside unions", () => {
		const schema = Validator.object({
			value: Validator.union([Validator.string(), Validator.number()]),
		});
		const result = schema.safeParse({ value: {} });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual(["value"]);
		}
	});

	it("reports paths for refine failures", () => {
		const schema = Validator.object({
			code: Validator.string().refine((s) => s === "x", "bad code"),
		});
		const result = schema.safeParse({ code: "y" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual(["code"]);
			expect(result.issues[0].message).toBe("bad code");
		}
	});
});

describe("schema metadata", () => {
	it("exposes kind for every schema type", () => {
		expect(Validator.string().kind).toBe("string");
		expect(Validator.number().kind).toBe("number");
		expect(Validator.boolean().kind).toBe("boolean");
		expect(Validator.bigint().kind).toBe("bigint");
		expect(Validator.literal("x").kind).toBe("literal");
		expect(Validator.enum(["x"]).kind).toBe("enum");
		expect(Validator.unknown().kind).toBe("unknown");
		expect(Validator.any().kind).toBe("any");
		expect(Validator.never().kind).toBe("never");
		expect(Validator.custom(() => true).kind).toBe("custom");
		expect(Validator.object({}).kind).toBe("object");
		expect(Validator.array(Validator.string()).kind).toBe("array");
		expect(Validator.tuple([Validator.string()]).kind).toBe("tuple");
		expect(Validator.union([Validator.string()]).kind).toBe("union");
		expect(
			Validator.discriminatedUnion("t", { a: Validator.string() }).kind,
		).toBe("discriminatedUnion");
		expect(Validator.record(Validator.string()).kind).toBe("record");
	});

	it("exposes non-null def objects for leaf schemas", () => {
		expect(Validator.string().def).toBeDefined();
		expect(Validator.object({ a: Validator.string() }).def).toBeDefined();
		expect(Validator.string().minLength(2).def).toBeDefined();
	});

	it("validate method is the schema itself", () => {
		const schema = Validator.number().min(0);
		expect(schema.validate).toBe(schema);
	});
});

describe("is() type guard behavior", () => {
	it("narrows values at runtime", () => {
		const schema = Validator.string().minLength(2);
		const values: unknown[] = ["ab", "a", 5, "hello"];
		const narrowed = values.filter((v) => schema.is(v));
		expect(narrowed).toEqual(["ab", "hello"]);
	});

	it("does not collect issues (fail fast)", () => {
		const schema = Validator.object({ a: Validator.number() });
		expect(schema.is({ a: "x" })).toBe(false);
		expect(schema.is({})).toBe(false);
	});
});