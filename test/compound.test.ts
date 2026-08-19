import { describe, expect, it } from "vitest";
import { Validator } from "../src/index";
import { firstIssue } from "./helpers";

describe("object schema basics", () => {
	const schema = Validator.object({
		name: Validator.string().minLength(3),
		age: Validator.number().int().min(0).max(120),
	});

	it("accepts valid objects", () => {
		expect(schema.is({ name: "Ada", age: 36 })).toBe(true);
	});

	it("rejects invalid fields", () => {
		expect(schema.is({ name: "Ad", age: 36 })).toBe(false);
		expect(schema.is({ name: "Ada", age: 200 })).toBe(false);
		expect(schema.is({ name: "Ada", age: 1.5 })).toBe(false);
	});

	it("rejects non-object inputs", () => {
		expect(schema.is(null)).toBe(false);
		expect(schema.is(undefined)).toBe(false);
		expect(schema.is([])).toBe(false);
		expect(schema.is([1, 2])).toBe(false);
		expect(schema.is("str")).toBe(false);
		expect(schema.is(42)).toBe(false);
		expect(schema.is(true)).toBe(false);
	});

	it("reports missing fields with path", () => {
		const result = schema.safeParse({ name: "Ada" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual(["age"]);
			expect(result.issues[0].message).toBe("Expected number");
			expect(result.issues[0].expected).toBe("number");
		}
	});

	it("reports field failures with the field path", () => {
		const result = schema.safeParse({ name: "x", age: 36 });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual(["name"]);
		}
	});

	it("returns the same reference when the shape is identical", () => {
		const input = { name: "Ada", age: 36 };
		expect(schema.validate(input)).toBe(input);
	});

	it("exposes its kind", () => {
		expect(schema.kind).toBe("object");
	});
});

describe("object key modes", () => {
	const base = () => Validator.object({ name: Validator.string() });

	it("strips unknown keys by default", () => {
		const schema = base();
		const input = { name: "Ada", extra: 1 };
		const out = schema.validate(input);
		expect(out).toEqual({ name: "Ada" });
		expect(out).not.toBe(input);
	});

	it("passthrough keeps unknown keys", () => {
		const schema = base().passthrough();
		const input = { name: "Ada", extra: 1 };
		expect(schema.validate(input)).toEqual({ name: "Ada", extra: 1 });
		expect(schema.validate(input)).toBe(input);
	});

	it("strict rejects unknown keys", () => {
		const schema = base().strict();
		expect(schema.is({ name: "Ada", extra: 1 })).toBe(false);
		expect(schema.is({ name: "Ada" })).toBe(true);
	});

	it("strict reports the unexpected key", () => {
		const schema = base().strict();
		const result = schema.safeParse({ name: "Ada", extra: 1, other: 2 });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe("Unexpected key: extra");
			expect(result.issues[0].path).toEqual([]);
		}
	});

	it("strict fails on the first unknown key before validating fields", () => {
		const schema = Validator.object({ name: Validator.number() }).strict();
		const result = schema.safeParse({ name: "x", zzz: 1 });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe("Unexpected key: zzz");
		}
	});

	it("strip and strict are re-entrant from passthrough", () => {
		const schema = base().passthrough();
		expect(schema.strip().validate({ name: "x", e: 1 })).toEqual({
			name: "x",
		});
		expect(schema.strict().is({ name: "x", e: 1 })).toBe(false);
		expect(schema.passthrough().validate({ name: "x", e: 1 })).toEqual({
			name: "x",
			e: 1,
		});
	});

	it("empty shape strips every key", () => {
		const schema = Validator.object({});
		expect(schema.is({})).toBe(true);
		expect(schema.validate({ a: 1, b: 2 })).toEqual({});
	});
});

describe("object with optional fields", () => {
	it("produces the key with undefined when missing", () => {
		const schema = Validator.object({ a: Validator.string().optional() });
		expect(schema.validate({})).toEqual({ a: undefined });
		expect(schema.validate({ a: "x" })).toEqual({ a: "x" });
	});

	it("accepts present and absent optional fields", () => {
		const schema = Validator.object({
			name: Validator.string(),
			nick: Validator.string().optional(),
		});
		expect(schema.is({ name: "Ada" })).toBe(true);
		expect(schema.is({ name: "Ada", nick: "A" })).toBe(true);
		expect(schema.is({ name: "Ada", nick: 1 })).toBe(false);
	});

	it("rebuilds the object when optional fields are present", () => {
		const schema = Validator.object({
			name: Validator.string(),
			nick: Validator.string().optional(),
		});
		const input = { name: "Ada", nick: "A" };
		const out = schema.validate(input);
		expect(out).toEqual(input);
		expect(out).not.toBe(input);
	});
});

describe("nested objects", () => {
	it("validates nested structures", () => {
		const schema = Validator.object({
			user: Validator.object({
				id: Validator.number(),
				profile: Validator.object({ bio: Validator.string() }),
			}),
		});
		expect(
			schema.is({ user: { id: 1, profile: { bio: "hi" } } }),
		).toBe(true);
		expect(schema.is({ user: { id: 1, profile: { bio: 2 } } })).toBe(false);
		expect(schema.is({ user: { id: "x", profile: { bio: "hi" } } })).toBe(
			false,
		);
	});

	it("reports deep nested paths", () => {
		const schema = Validator.object({
			user: Validator.object({ id: Validator.number() }),
		});
		const result = schema.safeParse({ user: { id: "x" } });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual(["user", "id"]);
			expect(result.issues[0].received).toBe("x");
		}
	});
});

describe("object with transforms", () => {
	it("builds a new object with transformed fields", () => {
		const schema = Validator.object({
			n: Validator.number().transform((x) => x * 2),
		});
		expect(schema.validate({ n: 3 })).toEqual({ n: 6 });
	});

	it("passthrough copies unknown keys alongside transforms", () => {
		const schema = Validator.object({
			n: Validator.number().transform((x) => x + 1),
		}).passthrough();
		expect(schema.validate({ n: 1, extra: "keep" })).toEqual({
			n: 2,
			extra: "keep",
		});
	});

	it("strip drops unknown keys alongside transforms", () => {
		const schema = Validator.object({
			n: Validator.number().transform((x) => x + 1),
		});
		expect(schema.validate({ n: 1, extra: "drop" })).toEqual({ n: 2 });
	});

	it("strict rejects unknown keys alongside transforms", () => {
		const schema = Validator.object({
			n: Validator.number().transform((x) => x + 1),
		}).strict();
		expect(schema.is({ n: 1, extra: 1 })).toBe(false);
		expect(schema.validate({ n: 1 })).toEqual({ n: 2 });
	});

	it("runs transforms inside nested objects", () => {
		const schema = Validator.object({
			meta: Validator.object({
				count: Validator.number().transform((x) => x * 2),
			}),
		});
		expect(schema.validate({ meta: { count: 5 } })).toEqual({
			meta: { count: 10 },
		});
	});

	it("reports errors before applying transforms", () => {
		const schema = Validator.object({
			n: Validator.string().transform((s) => s.length),
		});
		const result = schema.safeParse({ n: 123 });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual(["n"]);
			expect(result.issues[0].message).toBe("Expected string");
		}
	});
});

describe("array schema", () => {
	const schema = Validator.array(Validator.number()).min(2).max(3);

	it("accepts arrays within bounds", () => {
		expect(schema.is([1, 2])).toBe(true);
		expect(schema.is([1, 2, 3])).toBe(true);
		expect(schema.is([])).toBe(false);
		expect(schema.is([1])).toBe(false);
		expect(schema.is([1, 2, 3, 4])).toBe(false);
	});

	it("rejects arrays with invalid items", () => {
		expect(schema.is([1, "x"])).toBe(false);
		expect(schema.is([1, 2, 3, "x"])).toBe(false);
	});

	it("rejects non-arrays", () => {
		expect(schema.is("str")).toBe(false);
		expect(schema.is({ length: 3 })).toBe(false);
		expect(schema.is(null)).toBe(false);
		expect(schema.is(undefined)).toBe(false);
	});

	it("reports the array type error", () => {
		expect(Validator.array(Validator.number()).safeParse("nope")).toEqual({
			success: false,
			issues: [
				{
					path: [],
					message: "Expected array",
					expected: "array",
					received: "nope",
				},
			],
		});
	});

	it("reports check failures without a path", () => {
		const result = Validator.array(Validator.number())
			.min(2)
			.safeParse([1]);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual([]);
			expect(result.issues[0].message).toBe(
				"Array must contain at least 2 item(s)",
			);
		}
	});

	it("reports element failures with numeric paths", () => {
		const result = Validator.array(Validator.number()).safeParse([1, "x", 2]);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual([1]);
			expect(result.issues[0].message).toBe("Expected number");
		}
	});

	it("returns the same array reference on success", () => {
		const input = [1, 2, 3];
		expect(Validator.array(Validator.number()).validate(input)).toBe(input);
	});

	it("supports exact length", () => {
		const s = Validator.array(Validator.number()).length(2);
		expect(s.is([1, 2])).toBe(true);
		expect(s.is([1])).toBe(false);
		expect(s.is([1, 2, 3])).toBe(false);
		expect(firstIssue(s.safeParse([1]))?.message).toBe(
			"Array must contain exactly 2 item(s)",
		);
	});

	it("supports custom check messages", () => {
		const s = Validator.array(Validator.number()).min(1, "need one");
		expect(firstIssue(s.safeParse([]))?.message).toBe("need one");
	});

	it("validates nested arrays", () => {
		const s = Validator.array(Validator.array(Validator.number()));
		expect(s.is([[1], [2, 3]])).toBe(true);
		expect(s.is([[1], ["x"]])).toBe(false);
	});

	it("transforms elements", () => {
		const s = Validator.array(Validator.string().transform((v) => v.length));
		expect(s.validate(["ab", "c"])).toEqual([2, 1]);
	});

	it("reports paths inside object elements", () => {
		const s = Validator.array(
			Validator.object({ id: Validator.number() }),
		);
		const result = s.safeParse([{ id: 1 }, { id: "x" }]);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual([1, "id"]);
		}
	});

	it("supports empty arrays by default", () => {
		expect(Validator.array(Validator.number()).is([])).toBe(true);
	});

	it("exposes its kind", () => {
		expect(Validator.array(Validator.number()).kind).toBe("array");
	});
});

describe("tuple schema", () => {
	const schema = Validator.tuple([Validator.string(), Validator.number()]);

	it("accepts matching tuples", () => {
		expect(schema.is(["a", 1])).toBe(true);
	});

	it("rejects wrong lengths", () => {
		expect(schema.is(["a"])).toBe(false);
		expect(schema.is(["a", 1, 2])).toBe(false);
		expect(schema.is([])).toBe(false);
	});

	it("rejects wrong element types", () => {
		expect(schema.is(["a", "b"])).toBe(false);
		expect(schema.is([1, 1])).toBe(false);
	});

	it("rejects non-arrays", () => {
		expect(schema.is("ab")).toBe(false);
		expect(schema.is(null)).toBe(false);
		expect(schema.is({ 0: "a", 1: 1 })).toBe(false);
	});

	it("reports the length error", () => {
		const result = schema.safeParse(["a", 1, 2]);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe(
				"Expected 2 item(s), got 3",
			);
			expect(result.issues[0].expected).toBe("2 item(s)");
			expect(result.issues[0].received).toBe("3 item(s)");
		}
	});

	it("reports element failures with numeric paths", () => {
		const result = schema.safeParse(["a", "b"]);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual([1]);
			expect(result.issues[0].message).toBe("Expected number");
		}
	});

	it("returns the same tuple reference on success", () => {
		const input = ["a", 1];
		expect(schema.validate(input)).toBe(input);
	});

	it("transforms elements and rebuilds the tuple", () => {
		const s = Validator.tuple([
			Validator.string().transform((v) => v.length),
			Validator.number().transform((v) => v * 2),
		]);
		expect(s.validate(["ab", 3])).toEqual([2, 6]);
	});

	it("supports heterogeneous transforms", () => {
		const s = Validator.tuple([
			Validator.string(),
			Validator.number().transform((v) => String(v)),
		]);
		expect(s.validate(["x", 2])).toEqual(["x", "2"]);
	});

	it("supports empty tuples", () => {
		const s = Validator.tuple([]);
		expect(s.is([])).toBe(true);
		expect(s.is([1])).toBe(false);
	});

	it("exposes its kind", () => {
		expect(schema.kind).toBe("tuple");
	});
});

describe("union schema", () => {
	const schema = Validator.union([Validator.string(), Validator.number()]);

	it("accepts any member", () => {
		expect(schema.is("a")).toBe(true);
		expect(schema.is(1)).toBe(true);
		expect(schema.is(1.5)).toBe(true);
	});

	it("rejects values that match no member", () => {
		expect(schema.is(true)).toBe(false);
		expect(schema.is(null)).toBe(false);
		expect(schema.is(undefined)).toBe(false);
		expect(schema.is({})).toBe(false);
		expect(schema.is([])).toBe(false);
	});

	it("reports a union-level failure", () => {
		expect(schema.safeParse(true)).toEqual({
			success: false,
			issues: [
				{
					path: [],
					message: "Invalid value",
					expected: "union member",
					received: "true",
				},
			],
		});
	});

	it("unions literals", () => {
		const s = Validator.union([Validator.literal("a"), Validator.literal("b")]);
		expect(s.is("a")).toBe(true);
		expect(s.is("b")).toBe(true);
		expect(s.is("c")).toBe(false);
	});

	it("unions objects with distinct shapes", () => {
		const s = Validator.union([
			Validator.object({ a: Validator.string() }),
			Validator.object({ b: Validator.number() }),
		]);
		expect(s.is({ a: "x" })).toBe(true);
		expect(s.is({ b: 1 })).toBe(true);
		expect(s.is({ a: 1 })).toBe(false);
		expect(s.is({})).toBe(false);
	});

	it("rolls back issues from failed branches", () => {
		const s = Validator.union([
			Validator.object({ a: Validator.string() }),
			Validator.object({ b: Validator.number() }),
		]);
		const result = s.safeParse({ a: 1 });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].message).toBe("Invalid value");
			expect(result.issues[0].path).toEqual([]);
		}
	});

	it("supports nested unions", () => {
		const s = Validator.union([
			Validator.union([Validator.literal("a"), Validator.literal("b")]),
			Validator.number(),
		]);
		expect(s.is("a")).toBe(true);
		expect(s.is("b")).toBe(true);
		expect(s.is(3)).toBe(true);
		expect(s.is(true)).toBe(false);
	});

	it("selects the first matching member", () => {
		const s = Validator.union([
			Validator.string(),
			Validator.custom((v) => typeof v === "string"),
		]);
		expect(s.is("x")).toBe(true);
	});

	it("handles transforms inside union members", () => {
		const s = Validator.union([
			Validator.object({ a: Validator.number() }).transform((o) => ({
				...o,
				a: o.a * 2,
			})),
			Validator.string(),
		]);
		expect(s.validate({ a: 2 })).toEqual({ a: 4 });
		expect(s.validate("x")).toBe("x");
	});

	it("reports nested union failures with parent path", () => {
		const s = Validator.object({
			v: Validator.union([Validator.string(), Validator.number()]),
		});
		const result = s.safeParse({ v: true });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual(["v"]);
			expect(result.issues[0].message).toBe("Invalid value");
		}
	});

	it("exposes its kind", () => {
		expect(schema.kind).toBe("union");
	});
});

describe("discriminated union schema", () => {
	const schema = Validator.discriminatedUnion("type", {
		user: Validator.object({
			type: Validator.literal("user"),
			name: Validator.string(),
		}),
		admin: Validator.object({
			type: Validator.literal("admin"),
			level: Validator.number(),
		}),
	});

	it("accepts matching branches", () => {
		expect(schema.is({ type: "user", name: "Ada" })).toBe(true);
		expect(schema.is({ type: "admin", level: 2 })).toBe(true);
	});

	it("rejects unknown discriminators", () => {
		expect(schema.is({ type: "guest" })).toBe(false);
		expect(schema.is({ type: "user", level: 2 })).toBe(false);
		expect(schema.is({ type: "admin", name: "x" })).toBe(false);
	});

	it("rejects missing discriminators", () => {
		expect(schema.is({ name: "Ada" })).toBe(false);
		expect(schema.is({})).toBe(false);
	});

	it("reports invalid discriminator values", () => {
		const result = schema.safeParse({ type: "guest" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe(
				'Invalid discriminator value for "type"',
			);
			expect(result.issues[0].expected).toBe("known discriminator");
			expect(result.issues[0].received).toBe("guest");
		}
	});

	it("rejects non-object inputs", () => {
		const result = schema.safeParse("user");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe("Expected object");
			expect(result.issues[0].expected).toBe("object");
		}
	});

	it("reports branch validation failures", () => {
		const result = schema.safeParse({ type: "user", name: 1 });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual(["name"]);
			expect(result.issues[0].message).toBe("Expected string");
		}
	});

	it("supports transforms inside branches", () => {
		const s = Validator.discriminatedUnion("t", {
			a: Validator.object({
				t: Validator.literal("a"),
				v: Validator.number().transform((x) => x * 2),
			}),
		});
		expect(s.validate({ t: "a", v: 3 })).toEqual({ t: "a", v: 6 });
	});

	it("exposes its kind", () => {
		expect(schema.kind).toBe("discriminatedUnion");
	});
});

describe("record schema", () => {
	const schema = Validator.record(Validator.number());

	it("accepts records with valid values", () => {
		expect(schema.is({ a: 1, b: 2 })).toBe(true);
		expect(schema.is({})).toBe(true);
	});

	it("rejects records with invalid values", () => {
		expect(schema.is({ a: "x" })).toBe(false);
		expect(schema.is({ a: 1, b: "x" })).toBe(false);
	});

	it("rejects non-record inputs", () => {
		expect(schema.is(null)).toBe(false);
		expect(schema.is(undefined)).toBe(false);
		expect(schema.is([])).toBe(false);
		expect(schema.is("str")).toBe(false);
		expect(schema.is(42)).toBe(false);
	});

	it("reports the record type error", () => {
		expect(schema.safeParse([])).toEqual({
			success: false,
			issues: [
				{
					path: [],
					message: "Expected record",
					expected: "object",
					received: "array",
				},
			],
		});
	});

	it("reports value failures with key paths", () => {
		const result = schema.safeParse({ a: 1, b: "x" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual(["b"]);
			expect(result.issues[0].message).toBe("Expected number");
		}
	});

	it("returns the same reference on success", () => {
		const input = { a: 1 };
		expect(schema.validate(input)).toBe(input);
	});

	it("transforms values and rebuilds the record", () => {
		const s = Validator.record(Validator.number().transform((v) => v + 1));
		expect(s.validate({ a: 1, b: 2 })).toEqual({ a: 2, b: 3 });
	});

	it("validates nested records", () => {
		const s = Validator.record(Validator.record(Validator.number()));
		expect(s.is({ a: { b: 1 } })).toBe(true);
		expect(s.is({ a: { b: "x" } })).toBe(false);
	});

	it("exposes its kind", () => {
		expect(schema.kind).toBe("record");
	});
});

describe("deeply nested structures", () => {
	it("combines object, array, tuple and record", () => {
		const schema = Validator.object({
			list: Validator.array(
				Validator.tuple([Validator.string(), Validator.number()]),
			),
			map: Validator.record(Validator.object({ ok: Validator.boolean() })),
		});
		expect(
			schema.is({
				list: [
					["a", 1],
					["b", 2],
				],
				map: { x: { ok: true } },
			}),
		).toBe(true);
		expect(
			schema.is({
				list: [
					["a", 1],
					["b", "x"],
				],
				map: { x: { ok: true } },
			}),
		).toBe(false);
	});

	it("reports very deep paths", () => {
		const schema = Validator.object({
			users: Validator.array(
				Validator.object({ roles: Validator.array(Validator.string()) }),
			),
		});
		const result = schema.safeParse({
			users: [{ roles: ["admin", 1] }],
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual(["users", 0, "roles", 1]);
			expect(result.issues[0].message).toBe("Expected string");
		}
	});
});