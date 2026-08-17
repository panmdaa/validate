import { describe, expect, it } from "vitest";
import { type Infer, Validator } from "../src/index";

describe("basic schemas", () => {
	it("validates strings", () => {
		const schema = Validator.string();
		expect(schema.is("hello")).toBe(true);
		expect(schema.is(42)).toBe(false);
		expect(schema.validate("hello")).toBe("hello");
	});

	it("validates numbers", () => {
		const schema = Validator.number().int().min(0).max(10);
		expect(schema.is(5)).toBe(true);
		expect(schema.is(5.5)).toBe(false);
		expect(schema.is(-1)).toBe(false);
		expect(schema.is(11)).toBe(false);
		expect(schema.is(NaN)).toBe(false);
	});

	it("validates booleans", () => {
		const schema = Validator.boolean();
		expect(schema.is(true)).toBe(true);
		expect(schema.is(1)).toBe(false);
	});

	it("validates bigints", () => {
		const schema = Validator.bigint();
		expect(schema.is(10n)).toBe(true);
		expect(schema.is(10)).toBe(false);
	});

	it("validates literals", () => {
		const schema = Validator.literal("on");
		expect(schema.is("on")).toBe(true);
		expect(schema.is("off")).toBe(false);
		expect(schema.is(1)).toBe(false);
	});

	it("validates enums", () => {
		const schema = Validator.enum(["a", "b", "c"]);
		expect(schema.is("a")).toBe(true);
		expect(schema.is("d")).toBe(false);
	});

	it("passes through unknown and any", () => {
		expect(Validator.unknown().validate({ x: 1 })).toEqual({ x: 1 });
		expect(Validator.any().validate(undefined)).toBeUndefined();
	});

	it("never fails", () => {
		expect(Validator.never().is(1)).toBe(false);
	});

	it("validates custom predicates", () => {
		const schema = Validator.custom(
			(v) => typeof v === "string" && v.startsWith("v"),
		);
		expect(schema.is("v1")).toBe(true);
		expect(schema.is("1")).toBe(false);
	});

	it("uses string outcome or message from custom", () => {
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

	it("uses default custom message", () => {
		const schema = Validator.custom((v) => typeof v === "boolean");
		expect(schema.safeParse(1)).toEqual({
			success: false,
			issues: [{ path: [], message: "Invalid value" }],
		});
	});
});

describe("string modifiers", () => {
	const schema = Validator.string().minLength(3).maxLength(5).email();

	it("rejects short strings", () => {
		expect(schema.is("ab")).toBe(false);
	});

	it("rejects invalid emails", () => {
		expect(schema.is("abc@def")).toBe(false);
		expect(schema.is("a@b.c")).toBe(true);
		expect(schema.is("x".repeat(20))).toBe(false);
	});
});

describe("compound schemas", () => {
	it("validates objects", () => {
		const schema = Validator.object({
			name: Validator.string().minLength(3),
			age: Validator.number().int().min(0).max(120),
		});
		expect(schema.is({ name: "Ada", age: 36 })).toBe(true);
		expect(schema.is({ name: "Ad", age: 36 })).toBe(false);
		expect(schema.is({ name: "Ada", age: 200 })).toBe(false);
	});

	it("strips unknown keys by default", () => {
		const schema = Validator.object({ name: Validator.string() });
		const result = schema.validate({ name: "Ada", extra: 1 });
		expect(result).toEqual({ name: "Ada" });
	});

	it("passthrough keeps unknown keys", () => {
		const schema = Validator.object({ name: Validator.string() }).passthrough();
		const result = schema.validate({ name: "Ada", extra: 1 });
		expect(result).toEqual({ name: "Ada", extra: 1 });
	});

	it("strict rejects unknown keys", () => {
		const schema = Validator.object({ name: Validator.string() }).strict();
		expect(schema.is({ name: "Ada", extra: 1 })).toBe(false);
	});

	it("validates arrays", () => {
		const schema = Validator.array(Validator.number()).min(2);
		expect(schema.is([1, 2, 3])).toBe(true);
		expect(schema.is([1])).toBe(false);
		expect(schema.is([1, "x"])).toBe(false);
	});

	it("validates tuples", () => {
		const schema = Validator.tuple([Validator.string(), Validator.number()]);
		expect(schema.is(["a", 1])).toBe(true);
		expect(schema.is(["a"])).toBe(false);
		expect(schema.is(["a", "b"])).toBe(false);
	});

	it("validates unions", () => {
		const schema = Validator.union([Validator.string(), Validator.number()]);
		expect(schema.is("a")).toBe(true);
		expect(schema.is(1)).toBe(true);
		expect(schema.is(true)).toBe(false);
	});

	it("validates discriminated unions", () => {
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
		expect(schema.is({ type: "user", name: "Ada" })).toBe(true);
		expect(schema.is({ type: "admin", level: 2 })).toBe(true);
		expect(schema.is({ type: "guest" })).toBe(false);
	});

	it("validates records", () => {
		const schema = Validator.record(Validator.number());
		expect(schema.is({ a: 1, b: 2 })).toBe(true);
		expect(schema.is({ a: "x" })).toBe(false);
	});
});

describe("transform wrappers", () => {
	it("optional allows undefined", () => {
		const schema = Validator.string().optional();
		expect(schema.is(undefined)).toBe(true);
		expect(schema.is("a")).toBe(true);
		expect(schema.is(null)).toBe(false);
	});

	it("nullable allows null", () => {
		const schema = Validator.string().nullable();
		expect(schema.is(null)).toBe(true);
		expect(schema.is(undefined)).toBe(false);
	});

	it("default fills undefined", () => {
		const schema = Validator.string().default("fallback");
		expect(schema.validate(undefined)).toBe("fallback");
		expect(schema.validate("a")).toBe("a");
	});

	it("transform maps output", () => {
		const schema = Validator.string().transform((s) => s.length);
		expect(schema.validate("hello")).toBe(5);
	});

	it("refine with custom message", () => {
		const schema = Validator.string().refine(
			(s) => s === "secret",
			"not the secret",
		);
		expect(schema.safeParse("nope")).toEqual({
			success: false,
			issues: [{ path: [], message: "not the secret" }],
		});
	});
});

describe("results and errors", () => {
	it("safeParse returns success", () => {
		const result = Validator.string().safeParse("ok");
		expect(result).toEqual({ success: true, value: "ok" });
	});

	it("safeParse returns issues", () => {
		const result = Validator.number().safeParse("x");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].path).toEqual([]);
			expect(result.issues[0].message).toBe("Expected number");
		}
	});

	it("reports nested paths", () => {
		const schema = Validator.object({
			user: Validator.object({ id: Validator.number() }),
		});
		const result = schema.safeParse({ user: { id: "x" } });
		if (!result.success) {
			expect(result.issues[0].path).toEqual(["user", "id"]);
		}
	});

	it("validate throws on failure", () => {
		expect(() => Validator.string().validate(1)).toThrowError(
			"Expected string",
		);
	});
});

describe("types", () => {
	it("infers output types", () => {
		const schema = Validator.object({
			name: Validator.string(),
			age: Validator.number().int(),
			tags: Validator.array(Validator.string()).optional(),
		});
		type User = Infer<typeof schema>;
		const user: User = { name: "Ada", age: 36, tags: undefined };
		expect(user).toBeDefined();
	});
});

describe("callable schemas", () => {
	it("calls the schema directly", () => {
		const validate = Validator.object({
			name: Validator.string().minLength(3),
			age: Validator.number().int(),
		});
		expect(validate({ name: "Ada", age: 36 })).toEqual({
			name: "Ada",
			age: 36,
		});
	});

	it("throws on direct call failure", () => {
		const validate = Validator.string().minLength(3);
		expect(() => validate("ab")).toThrowError(
			"String must contain at least 3 character(s)",
		);
	});

	it("validate method is the schema itself", () => {
		const validate = Validator.number().min(0);
		expect(validate.validate).toBe(validate);
	});

	it("is callable with chained wrappers", () => {
		const validate = Validator.string().optional().default("none");
		expect(validate(undefined)).toBe("none");
		expect(validate("x")).toBe("x");
	});
});
