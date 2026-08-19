import { describe, expect, it } from "vitest";
import { ValidationError, Validator } from "../src/index";

describe("optional wrapper", () => {
	it("allows undefined", () => {
		const schema = Validator.string().optional();
		expect(schema.is(undefined)).toBe(true);
		expect(schema.is("a")).toBe(true);
		expect(schema.is(null)).toBe(false);
		expect(schema.is(1)).toBe(false);
	});

	it("returns undefined unchanged", () => {
		expect(Validator.string().optional().validate(undefined)).toBeUndefined();
	});

	it("validates the inner schema for other values", () => {
		const schema = Validator.string().optional();
		const result = schema.safeParse(1);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe("Expected string");
		}
	});

	it("exposes its kind", () => {
		expect(Validator.string().optional().kind).toBe("optional");
	});
});

describe("nullable wrapper", () => {
	it("allows null", () => {
		const schema = Validator.string().nullable();
		expect(schema.is(null)).toBe(true);
		expect(schema.is("a")).toBe(true);
		expect(schema.is(undefined)).toBe(false);
	});

	it("returns null unchanged", () => {
		expect(Validator.string().nullable().validate(null)).toBeNull();
	});

	it("validates the inner schema for other values", () => {
		const schema = Validator.string().nullable();
		const result = schema.safeParse(1);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe("Expected string");
		}
	});

	it("exposes its kind", () => {
		expect(Validator.string().nullable().kind).toBe("nullable");
	});
});

describe("optional and nullable combinations", () => {
	it("optional then nullable accepts null and undefined", () => {
		const schema = Validator.string().optional().nullable();
		expect(schema.is(undefined)).toBe(true);
		expect(schema.is(null)).toBe(true);
		expect(schema.is("a")).toBe(true);
		expect(schema.is(1)).toBe(false);
	});

	it("nullable then optional accepts null and undefined", () => {
		const schema = Validator.string().nullable().optional();
		expect(schema.is(undefined)).toBe(true);
		expect(schema.is(null)).toBe(true);
		expect(schema.is("a")).toBe(true);
	});
});

describe("default wrapper", () => {
	it("fills undefined with the default", () => {
		const schema = Validator.string().default("fallback");
		expect(schema.validate(undefined)).toBe("fallback");
		expect(schema.validate("a")).toBe("a");
	});

	it("does not interfere with other invalid values", () => {
		const schema = Validator.string().default("x");
		expect(schema.is(1)).toBe(false);
	});

	it("evaluates function defaults once at creation", () => {
		const schema = Validator.string().default(() => "computed");
		expect(schema.validate(undefined)).toBe("computed");
	});

	it("supports default values of any type", () => {
		const schema = Validator.number().default(42);
		expect(schema.validate(undefined)).toBe(42);
		expect(schema.validate(0)).toBe(0);
	});

	it("works when chained after optional", () => {
		const schema = Validator.string().optional().default("none");
		expect(schema.validate(undefined)).toBe("none");
		expect(schema.validate("x")).toBe("x");
		expect(() => schema.validate(null)).toThrow(ValidationError);
	});

	it("does not default when optional is outermost", () => {
		const schema = Validator.string().default("none").optional();
		expect(schema.validate(undefined)).toBeUndefined();
		expect(schema.validate("x")).toBe("x");
	});

	it("applies defaults inside objects", () => {
		const schema = Validator.object({
			role: Validator.string().default("user"),
		});
		expect(schema.validate({})).toEqual({ role: "user" });
		expect(schema.validate({ role: "admin" })).toEqual({ role: "admin" });
	});

	it("applies defaults inside arrays", () => {
		const schema = Validator.array(
			Validator.string().default("n/a"),
		);
		expect(schema.validate([undefined, "x"])).toEqual(["n/a", "x"]);
	});

	it("exposes its kind", () => {
		expect(Validator.string().default("x").kind).toBe("default");
	});
});

describe("transform wrapper", () => {
	it("maps the output", () => {
		const schema = Validator.string().transform((s) => s.length);
		expect(schema.validate("hello")).toBe(5);
		expect(schema.safeParse("hello")).toEqual({ success: true, value: 5 });
	});

	it("runs only after the inner schema passes", () => {
		const schema = Validator.string().transform((s) => s.toUpperCase());
		expect(schema.is(1)).toBe(false);
		const result = schema.safeParse(1);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe("Expected string");
		}
	});

	it("can change the type entirely", () => {
		const schema = Validator.number().transform((n) => `n=${n}`);
		expect(schema.validate(1)).toBe("n=1");
	});

	it("can transform to objects", () => {
		const schema = Validator.string().transform((s) => ({ value: s }));
		expect(schema.validate("a")).toEqual({ value: "a" });
	});

	it("supports chained transforms", () => {
		const schema = Validator.number()
			.transform((n) => n + 1)
			.transform((n) => n * 2);
		expect(schema.validate(1)).toBe(4);
	});

	it("supports transforms returning undefined", () => {
		const schema = Validator.string().transform(() => undefined);
		expect(schema.validate("x")).toBeUndefined();
	});

	it("applies transforms inside objects", () => {
		const schema = Validator.object({
			n: Validator.number().transform((x) => x * 2),
		});
		expect(schema.validate({ n: 2 })).toEqual({ n: 4 });
	});

	it("applies transforms inside unions", () => {
		const schema = Validator.union([
			Validator.number().transform((n) => n * 10),
			Validator.string(),
		]);
		expect(schema.validate(1)).toBe(10);
		expect(schema.validate("a")).toBe("a");
	});

	it("exposes its kind", () => {
		expect(Validator.string().transform((s) => s).kind).toBe("transform");
	});
});

describe("refine wrapper", () => {
	it("rejects when the predicate returns false", () => {
		const schema = Validator.string().refine((s) => s === "secret");
		expect(schema.is("secret")).toBe(true);
		expect(schema.is("nope")).toBe(false);
	});

	it("uses the default message", () => {
		const schema = Validator.string().refine((s) => s === "secret");
		expect(schema.safeParse("nope")).toEqual({
			success: false,
			issues: [{ path: [], message: "Invalid value" }],
		});
	});

	it("uses a custom message", () => {
		const schema = Validator.string().refine(
			(s) => s === "secret",
			"not the secret",
		);
		expect(schema.safeParse("nope")).toEqual({
			success: false,
			issues: [{ path: [], message: "not the secret" }],
		});
	});

	it("uses string outcomes as messages", () => {
		const schema = Validator.string().refine((s) =>
			s.length > 3 || "too short",
		);
		expect(schema.safeParse("ab")).toEqual({
			success: false,
			issues: [{ path: [], message: "too short" }],
		});
		expect(schema.safeParse("abcd")).toEqual({
			success: true,
			value: "abcd",
		});
	});

	it("validates the inner schema first", () => {
		const schema = Validator.string().refine(() => true);
		const result = schema.safeParse(1);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe("Expected string");
		}
	});

	it("receives transformed values when chained after transform", () => {
		const schema = Validator.string()
			.transform((s) => s.length)
			.refine((n) => n > 3, "too short");
		expect(schema.safeParse("hi")).toEqual({
			success: false,
			issues: [{ path: [], message: "too short" }],
		});
		expect(schema.safeParse("hello")).toEqual({
			success: true,
			value: 5,
		});
	});

	it("works inside objects with paths", () => {
		const schema = Validator.object({
			code: Validator.string().refine((s) => /^\d+$/.test(s), "digits only"),
		});
		const result = schema.safeParse({ code: "abc" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual(["code"]);
			expect(result.issues[0].message).toBe("digits only");
		}
	});

	it("exposes its kind", () => {
		expect(Validator.string().refine(() => true).kind).toBe("refine");
	});
});

describe("wrapper combinations", () => {
	it("optional + default + transform", () => {
		const schema = Validator.number()
			.optional()
			.default(0)
			.transform((n) => n * 2);
		expect(schema.validate(undefined)).toBe(0);
		expect(schema.validate(3)).toBe(6);
	});

	it("default + transform + refine", () => {
		const schema = Validator.number()
			.default(5)
			.transform((n) => n * 2)
			.refine((n) => n >= 10, "too small");
		expect(schema.validate(undefined)).toBe(10);
		const result = schema.safeParse(1);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe("too small");
		}
	});

	it("wrappers compose with compound schemas", () => {
		const schema = Validator.object({
			items: Validator.array(Validator.number().transform((n) => n * 2)),
		})
			.optional()
			.default({ items: [] });
		expect(schema.validate(undefined)).toEqual({ items: [] });
		expect(schema.validate({ items: [1, 2] })).toEqual({ items: [2, 4] });
	});

	it("is() works with transforms (checks the output type)", () => {
		const schema = Validator.string().transform((s) => s.length);
		expect(schema.is("hello")).toBe(true);
		expect(schema.is(5)).toBe(false);
	});

	it("immutability: wrappers return new schemas", () => {
		const base = Validator.string();
		const optional = base.optional();
		const nullable = base.nullable();
		expect(base.is(undefined)).toBe(false);
		expect(optional.is(undefined)).toBe(true);
		expect(nullable.is(undefined)).toBe(false);
		expect(nullable.is(null)).toBe(true);
	});
});