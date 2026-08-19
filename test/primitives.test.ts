import { describe, expect, it } from "vitest";
import { Validator } from "../src/index";

describe("string primitive", () => {
	it("accepts strings including the empty string", () => {
		const schema = Validator.string();
		expect(schema.is("")).toBe(true);
		expect(schema.is("hello")).toBe(true);
		expect(schema.is(String("x"))).toBe(true);
	});

	it("rejects all non-string values", () => {
		const schema = Validator.string();
		const bad = [
			1,
			1.5,
			NaN,
			true,
			false,
			null,
			undefined,
			{},
			[],
			Symbol("s"),
			10n,
			() => {},
		];
		for (const value of bad) {
			expect(schema.is(value)).toBe(false);
		}
	});

	it("reports expected string with received description", () => {
		expect(Validator.string().safeParse(42)).toEqual({
			success: false,
			issues: [
				{
					path: [],
					message: "Expected string",
					expected: "string",
					received: "42",
				},
			],
		});
	});

	it("returns the value untouched on success", () => {
		expect(Validator.string().validate("x")).toBe("x");
	});

	it("exposes its kind", () => {
		expect(Validator.string().kind).toBe("string");
	});
});

describe("number primitive", () => {
	it("accepts numbers including zero and negatives", () => {
		const schema = Validator.number();
		expect(schema.is(0)).toBe(true);
		expect(schema.is(-42)).toBe(true);
		expect(schema.is(3.14)).toBe(true);
	});

	it("accepts Infinity by default", () => {
		const schema = Validator.number();
		expect(schema.is(Infinity)).toBe(true);
		expect(schema.is(-Infinity)).toBe(true);
	});

	it("rejects non-numbers and NaN", () => {
		const schema = Validator.number();
		expect(schema.is(NaN)).toBe(false);
		expect(schema.is("1")).toBe(false);
		expect(schema.is("1.5")).toBe(false);
		expect(schema.is(null)).toBe(false);
		expect(schema.is(undefined)).toBe(false);
		expect(schema.is(true)).toBe(false);
		expect(schema.is([])).toBe(false);
		expect(schema.is(10n)).toBe(false);
	});

	it("reports expected number with received description", () => {
		expect(Validator.number().safeParse("x")).toEqual({
			success: false,
			issues: [
				{
					path: [],
					message: "Expected number",
					expected: "number",
					received: "x",
				},
			],
		});
	});

	it("reports NaN as received", () => {
		const result = Validator.number().safeParse(NaN);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].received).toBe("NaN");
		}
	});

	it("exposes its kind", () => {
		expect(Validator.number().kind).toBe("number");
	});
});

describe("boolean primitive", () => {
	it("accepts true and false only", () => {
		const schema = Validator.boolean();
		expect(schema.is(true)).toBe(true);
		expect(schema.is(false)).toBe(true);
		expect(schema.is(0)).toBe(false);
		expect(schema.is(1)).toBe(false);
		expect(schema.is("true")).toBe(false);
		expect(schema.is("false")).toBe(false);
		expect(schema.is(null)).toBe(false);
		expect(schema.is(undefined)).toBe(false);
		expect(schema.is({})).toBe(false);
		expect(schema.is([])).toBe(false);
	});

	it("reports expected boolean", () => {
		const result = Validator.boolean().safeParse(1);
		expect(result).toEqual({
			success: false,
			issues: [
				{
					path: [],
					message: "Expected boolean",
					expected: "boolean",
					received: "1",
				},
			],
		});
	});

	it("exposes its kind", () => {
		expect(Validator.boolean().kind).toBe("boolean");
	});
});

describe("bigint primitive", () => {
	it("accepts bigints", () => {
		const schema = Validator.bigint();
		expect(schema.is(10n)).toBe(true);
		expect(schema.is(-3n)).toBe(true);
		expect(schema.is(0n)).toBe(true);
	});

	it("rejects numbers and other values", () => {
		const schema = Validator.bigint();
		expect(schema.is(10)).toBe(false);
		expect(schema.is("10")).toBe(false);
		expect(schema.is(10.5)).toBe(false);
		expect(schema.is(null)).toBe(false);
	});

	it("reports expected bigint", () => {
		expect(Validator.bigint().safeParse(10)).toEqual({
			success: false,
			issues: [
				{
					path: [],
					message: "Expected bigint",
					expected: "bigint",
					received: "10",
				},
			],
		});
	});

	it("exposes its kind", () => {
		expect(Validator.bigint().kind).toBe("bigint");
	});
});

describe("literal schema", () => {
	it("accepts string literals", () => {
		const schema = Validator.literal("on");
		expect(schema.is("on")).toBe(true);
		expect(schema.is("off")).toBe(false);
		expect(schema.is("")).toBe(false);
	});

	it("accepts number, boolean, null, undefined and bigint literals", () => {
		expect(Validator.literal(1).is(1)).toBe(true);
		expect(Validator.literal(1).is("1")).toBe(false);
		expect(Validator.literal(true).is(true)).toBe(true);
		expect(Validator.literal(false).is(true)).toBe(false);
		expect(Validator.literal(null).is(null)).toBe(true);
		expect(Validator.literal(null).is(undefined)).toBe(false);
		expect(Validator.literal(undefined).is(undefined)).toBe(true);
		expect(Validator.literal(10n).is(10n)).toBe(true);
		expect(Validator.literal(10n).is(10)).toBe(false);
	});

	it("reports invalid literal with expected value", () => {
		expect(Validator.literal("on").safeParse("off")).toEqual({
			success: false,
			issues: [
				{
					path: [],
					message: "Invalid literal",
					expected: "on",
					received: "off",
				},
			],
		});
	});

	it("rejects NaN literal (NaN !== NaN)", () => {
		expect(Validator.literal(NaN).is(NaN)).toBe(false);
	});

	it("exposes its kind", () => {
		expect(Validator.literal("x").kind).toBe("literal");
	});
});

describe("enum schema", () => {
	it("accepts values present in the enum", () => {
		const schema = Validator.enum(["a", "b", "c"]);
		expect(schema.is("a")).toBe(true);
		expect(schema.is("c")).toBe(true);
		expect(schema.is("d")).toBe(false);
		expect(schema.is("")).toBe(false);
	});

	it("supports mixed string/number/boolean enums", () => {
		const schema = Validator.enum(["a", 1, true]);
		expect(schema.is("a")).toBe(true);
		expect(schema.is(1)).toBe(true);
		expect(schema.is(true)).toBe(true);
		expect(schema.is("1")).toBe(false);
		expect(schema.is(1n)).toBe(false);
		expect(schema.is(false)).toBe(false);
	});

	it("rejects all values for an empty enum", () => {
		const schema = Validator.enum([]);
		expect(schema.is("a")).toBe(false);
		expect(schema.is(1)).toBe(false);
		expect(schema.is(null)).toBe(false);
		expect(schema.is({})).toBe(false);
	});

	it("reports invalid enum value", () => {
		const result = Validator.enum(["a"]).safeParse("b");
		expect(result).toEqual({
			success: false,
			issues: [
				{
					path: [],
					message: "Invalid enum value",
					expected: "enum value",
					received: "b",
				},
			],
		});
	});

	it("rejects non-primitive enum inputs", () => {
		const schema = Validator.enum(["a"]);
		expect(schema.is({})).toBe(false);
		expect(schema.is([])).toBe(false);
		expect(schema.is(null)).toBe(false);
		expect(schema.is(undefined)).toBe(false);
	});

	it("exposes its kind", () => {
		expect(Validator.enum(["a"]).kind).toBe("enum");
	});
});

describe("unknown and any schemas", () => {
	it("unknown passes through every value by reference", () => {
		const schema = Validator.unknown();
		const obj = { x: 1 };
		const arr = [1, 2];
		expect(schema.is(null)).toBe(true);
		expect(schema.is(undefined)).toBe(true);
		expect(schema.is(NaN)).toBe(true);
		expect(schema.validate(obj)).toBe(obj);
		expect(schema.validate(arr)).toBe(arr);
		expect(schema.safeParse(42)).toEqual({ success: true, value: 42 });
	});

	it("any passes through every value by reference", () => {
		const schema = Validator.any();
		const obj = { x: 1 };
		expect(schema.validate(obj)).toBe(obj);
		expect(schema.validate(undefined)).toBeUndefined();
		expect(schema.is(Symbol("s"))).toBe(true);
	});

	it("exposes its kinds", () => {
		expect(Validator.unknown().kind).toBe("unknown");
		expect(Validator.any().kind).toBe("any");
	});
});

describe("never schema", () => {
	it("rejects every value", () => {
		const schema = Validator.never();
		expect(schema.is(1)).toBe(false);
		expect(schema.is("a")).toBe(false);
		expect(schema.is(null)).toBe(false);
		expect(schema.is(undefined)).toBe(false);
		expect(schema.is({})).toBe(false);
	});

	it("reports expected never", () => {
		expect(Validator.never().safeParse(1)).toEqual({
			success: false,
			issues: [{ path: [], message: "Expected never" }],
		});
	});

	it("exposes its kind", () => {
		expect(Validator.never().kind).toBe("never");
	});
});

describe("custom schema", () => {
	it("validates boolean predicates", () => {
		const schema = Validator.custom(
			(v) => typeof v === "string" && v.startsWith("v"),
		);
		expect(schema.is("v1")).toBe(true);
		expect(schema.is("1")).toBe(false);
	});

	it("uses string outcomes as messages", () => {
		const schema = Validator.custom((v) =>
			typeof v === "number" ? v > 0 || "must be positive" : "must be a number",
		);
		expect(schema.safeParse(5)).toEqual({ success: true, value: 5 });
		expect(schema.safeParse(-1)).toEqual({
			success: false,
			issues: [{ path: [], message: "must be positive" }],
		});
		expect(schema.safeParse("x")).toEqual({
			success: false,
			issues: [{ path: [], message: "must be a number" }],
		});
	});

	it("uses the default message when the predicate returns false", () => {
		const schema = Validator.custom((v) => typeof v === "boolean");
		expect(schema.safeParse(1)).toEqual({
			success: false,
			issues: [{ path: [], message: "Invalid value" }],
		});
	});

	it("uses the provided custom message", () => {
		const schema = Validator.custom<number>((v) => v > 0, "positive please");
		expect(schema.safeParse(-1)).toEqual({
			success: false,
			issues: [{ path: [], message: "positive please" }],
		});
	});

	it("exposes its kind", () => {
		expect(Validator.custom(() => true).kind).toBe("custom");
	});
});