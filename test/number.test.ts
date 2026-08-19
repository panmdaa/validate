import { describe, expect, it } from "vitest";
import { Validator } from "../src/index";

describe("number int", () => {
	const schema = Validator.number().int();

	it("accepts integers", () => {
		expect(schema.is(0)).toBe(true);
		expect(schema.is(-0)).toBe(true);
		expect(schema.is(42)).toBe(true);
		expect(schema.is(-42)).toBe(true);
	});

	it("rejects floats", () => {
		expect(schema.is(0.5)).toBe(false);
		expect(schema.is(-1.5)).toBe(false);
		expect(schema.is(Math.PI)).toBe(false);
	});

	it("uses the default message", () => {
		expect(schema.safeParse(1.5)).toEqual({
			success: false,
			issues: [{ path: [], message: "Expected an integer" }],
		});
	});

	it("accepts a custom message", () => {
		const s = Validator.number().int("must be whole");
		const result = s.safeParse(1.5);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe("must be whole");
		}
	});
});

describe("number finite", () => {
	const schema = Validator.number().finite();

	it("accepts finite numbers", () => {
		expect(schema.is(0)).toBe(true);
		expect(schema.is(-1e6)).toBe(true);
		expect(schema.is(Number.MIN_VALUE)).toBe(true);
	});

	it("rejects Infinity and NaN", () => {
		expect(schema.is(Infinity)).toBe(false);
		expect(schema.is(-Infinity)).toBe(false);
		expect(schema.is(NaN)).toBe(false);
	});
});

describe("number safe", () => {
	const schema = Validator.number().safe();

	it("accepts safe integers", () => {
		expect(schema.is(0)).toBe(true);
		expect(schema.is(Number.MAX_SAFE_INTEGER)).toBe(true);
		expect(schema.is(-Number.MAX_SAFE_INTEGER)).toBe(true);
	});

	it("rejects unsafe integers and floats", () => {
		expect(schema.is(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
		expect(schema.is(-Number.MAX_SAFE_INTEGER - 1)).toBe(false);
		expect(schema.is(1.5)).toBe(false);
	});
});

describe("number min / max", () => {
	it("min is inclusive", () => {
		const schema = Validator.number().min(0);
		expect(schema.is(0)).toBe(true);
		expect(schema.is(1)).toBe(true);
		expect(schema.is(-0.5)).toBe(false);
		expect(schema.safeParse(-1).issues?.[0]?.message ?? "").toBe(
			"Number must be >= 0",
		);
	});

	it("max is inclusive", () => {
		const schema = Validator.number().max(10);
		expect(schema.is(10)).toBe(true);
		expect(schema.is(9.99)).toBe(true);
		expect(schema.is(10.01)).toBe(false);
		expect(schema.safeParse(11).issues?.[0]?.message ?? "").toBe(
			"Number must be <= 10",
		);
	});

	it("accepts custom messages", () => {
		const schema = Validator.number().min(0, "too small").max(10, "too big");
		expect(schema.safeParse(-1).issues?.[0]?.message).toBe("too small");
		expect(schema.safeParse(11).issues?.[0]?.message).toBe("too big");
	});

	it("supports the common range idiom", () => {
		const schema = Validator.number().int().min(0).max(120);
		expect(schema.is(0)).toBe(true);
		expect(schema.is(120)).toBe(true);
		expect(schema.is(-1)).toBe(false);
		expect(schema.is(121)).toBe(false);
		expect(schema.is(1.5)).toBe(false);
	});
});

describe("number sign checks", () => {
	it("positive rejects zero and negatives", () => {
		const schema = Validator.number().positive();
		expect(schema.is(1)).toBe(true);
		expect(schema.is(0)).toBe(false);
		expect(schema.is(-1)).toBe(false);
		expect(schema.safeParse(0).issues?.[0]?.message).toBe(
			"Number must be positive",
		);
	});

	it("negative rejects zero and positives", () => {
		const schema = Validator.number().negative();
		expect(schema.is(-1)).toBe(true);
		expect(schema.is(0)).toBe(false);
		expect(schema.is(1)).toBe(false);
		expect(schema.safeParse(0).issues?.[0]?.message).toBe(
			"Number must be negative",
		);
	});

	it("nonnegative allows zero", () => {
		const schema = Validator.number().nonnegative();
		expect(schema.is(0)).toBe(true);
		expect(schema.is(1)).toBe(true);
		expect(schema.is(-0.0001)).toBe(false);
		expect(schema.safeParse(-1).issues?.[0]?.message).toBe(
			"Number must be non-negative",
		);
	});

	it("nonpositive allows zero", () => {
		const schema = Validator.number().nonpositive();
		expect(schema.is(0)).toBe(true);
		expect(schema.is(-1)).toBe(true);
		expect(schema.is(0.0001)).toBe(false);
		expect(schema.safeParse(1).issues?.[0]?.message).toBe(
			"Number must be non-positive",
		);
	});

	it("accepts custom messages for sign checks", () => {
		const schema = Validator.number().positive("pos only");
		expect(schema.safeParse(0).issues?.[0]?.message).toBe("pos only");
	});
});

describe("number check order and combination", () => {
	it("evaluates checks in order", () => {
		const schema = Validator.number().int().positive().max(10);
		expect(schema.is(5)).toBe(true);
		expect(schema.is(0)).toBe(false);
		expect(schema.is(11)).toBe(false);
		expect(schema.is(1.5)).toBe(false);
	});

	it("reports the first failing check message", () => {
		const schema = Validator.number().int().min(5);
		const result = schema.safeParse(1.5);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe("Expected an integer");
		}
	});

	it("does not mutate the original schema when chaining", () => {
		const base = Validator.number();
		const derived = base.min(5);
		expect(base.is(1)).toBe(true);
		expect(derived.is(1)).toBe(false);
	});
});

describe("number custom message overrides", () => {
	it("uses overridden messages throughout the chain", () => {
		const schema = Validator.number()
			.int("int")
			.min(0, "min")
			.max(10, "max");
		const intIssue = schema.safeParse(1.5);
		const minIssue = schema.safeParse(-1);
		const maxIssue = schema.safeParse(11);
		if (!intIssue.success) expect(intIssue.issues[0].message).toBe("int");
		if (!minIssue.success) expect(minIssue.issues[0].message).toBe("min");
		if (!maxIssue.success) expect(maxIssue.issues[0].message).toBe("max");
	});
});