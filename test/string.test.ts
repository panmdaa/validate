import { describe, expect, it } from "vitest";
import { Validator } from "../src/index";
import { firstIssue } from "./helpers";

describe("string minLength", () => {
	const schema = Validator.string().minLength(3);

	it("accepts strings with at least the minimum length", () => {
		expect(schema.is("abc")).toBe(true);
		expect(schema.is("abcd")).toBe(true);
	});

	it("rejects shorter strings", () => {
		expect(schema.is("")).toBe(false);
		expect(schema.is("ab")).toBe(false);
	});

	it("uses the default message", () => {
		expect(schema.safeParse("ab")).toEqual({
			success: false,
			issues: [
				{
					path: [],
					message: "String must contain at least 3 character(s)",
				},
			],
		});
	});

	it("accepts a custom message", () => {
		const s = Validator.string().minLength(3, "too short");
		const result = s.safeParse("ab");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe("too short");
		}
	});

	it("supports chaining and counts by character length", () => {
		const s = Validator.string().minLength(2).minLength(4);
		expect(s.is("ab")).toBe(false);
		expect(s.is("abcd")).toBe(true);
	});
});

describe("string maxLength", () => {
	const schema = Validator.string().maxLength(3);

	it("accepts strings with at most the maximum length", () => {
		expect(schema.is("abc")).toBe(true);
		expect(schema.is("")).toBe(true);
	});

	it("rejects longer strings", () => {
		expect(schema.is("abcd")).toBe(false);
	});

	it("uses the default message", () => {
		expect(schema.safeParse("abcd")).toEqual({
			success: false,
			issues: [
				{
					path: [],
					message: "String must contain at most 3 character(s)",
				},
			],
		});
	});

	it("accepts a custom message", () => {
		const s = Validator.string().maxLength(3, "too long");
		const result = s.safeParse("abcd");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe("too long");
		}
	});
});

describe("string length", () => {
	const schema = Validator.string().length(3);

	it("accepts strings of exact length", () => {
		expect(schema.is("abc")).toBe(true);
	});

	it("rejects other lengths", () => {
		expect(schema.is("ab")).toBe(false);
		expect(schema.is("abcd")).toBe(false);
		expect(schema.is("")).toBe(false);
	});

	it("uses the default message", () => {
		expect(schema.safeParse("ab")).toEqual({
			success: false,
			issues: [
				{
					path: [],
					message: "String must contain exactly 3 character(s)",
				},
			],
		});
	});
});

describe("string pattern", () => {
	const schema = Validator.string().pattern(/^\d{2,3}$/);

	it("accepts strings matching the pattern", () => {
		expect(schema.is("12")).toBe(true);
		expect(schema.is("123")).toBe(true);
	});

	it("rejects non-matching strings", () => {
		expect(schema.is("1")).toBe(false);
		expect(schema.is("1234")).toBe(false);
		expect(schema.is("abc")).toBe(false);
		expect(schema.is("")).toBe(false);
	});

	it("uses the default message", () => {
		const result = schema.safeParse("abc");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe(
				"String must match the pattern /^\\d{2,3}$/",
			);
		}
	});

	it("matches with anchors and flags", () => {
		expect(Validator.string().pattern(/^a/i).is("ABC")).toBe(true);
		expect(Validator.string().pattern(/^a/i).is("b")).toBe(false);
	});

	it("is consistent across repeated calls with a global regex", () => {
		const s = Validator.string().pattern(/[a-z]+/g);
		expect(s.is("abc")).toBe(true);
		expect(s.is("abc")).toBe(true);
		expect(s.is("def")).toBe(true);
	});
});

describe("string email", () => {
	const schema = Validator.string().email();

	it("accepts well-formed emails", () => {
		expect(schema.is("a@b.c")).toBe(true);
		expect(schema.is("user@example.com")).toBe(true);
		expect(schema.is("first.last+tag@sub.example.co")).toBe(true);
		expect(schema.is("user_name@example.com")).toBe(true);
	});

	it("rejects malformed emails", () => {
		expect(schema.is("abc@def")).toBe(false);
		expect(schema.is("@example.com")).toBe(false);
		expect(schema.is("a@")).toBe(false);
		expect(schema.is("a@b.")).toBe(false);
		expect(schema.is("a b@c.com")).toBe(false);
		expect(schema.is(" a@b.com")).toBe(false);
		expect(schema.is("a@b.com ")).toBe(false);
		expect(schema.is("")).toBe(false);
	});

	it("uses the default message", () => {
		expect(schema.safeParse("nope")).toEqual({
			success: false,
			issues: [{ path: [], message: "Invalid email address" }],
		});
	});

	it("accepts a custom message", () => {
		const s = Validator.string().email("not an email");
		const result = s.safeParse("nope");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe("not an email");
		}
	});
});

describe("string url", () => {
	const schema = Validator.string().url();

	it("accepts valid absolute URLs", () => {
		expect(schema.is("https://example.com")).toBe(true);
		expect(schema.is("http://localhost:3000/path?q=1#frag")).toBe(true);
		expect(schema.is("https://sub.example.co:8443/a/b")).toBe(true);
		expect(schema.is("mailto:user@example.com")).toBe(true);
	});

	it("rejects invalid or relative URLs", () => {
		expect(schema.is("example.com")).toBe(false);
		expect(schema.is("/relative/path")).toBe(false);
		expect(schema.is("")).toBe(false);
		expect(schema.is("ht tp://x")).toBe(false);
	});

	it("uses the default message", () => {
		expect(schema.safeParse("nope")).toEqual({
			success: false,
			issues: [{ path: [], message: "Invalid URL" }],
		});
	});

	it("accepts a custom message", () => {
		const s = Validator.string().url("not a url");
		const result = s.safeParse("nope");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe("not a url");
		}
	});
});

describe("string startsWith / endsWith / includes", () => {
	it("validates startsWith", () => {
		const schema = Validator.string().startsWith("foo");
		expect(schema.is("foobar")).toBe(true);
		expect(schema.is("barfoo")).toBe(false);
		expect(firstIssue(schema.safeParse("bar"))?.message ?? "").toBe(
			'String must start with "foo"',
		);
	});

	it("validates endsWith", () => {
		const schema = Validator.string().endsWith("bar");
		expect(schema.is("foobar")).toBe(true);
		expect(schema.is("barfoo")).toBe(false);
		expect(firstIssue(schema.safeParse("foo"))?.message ?? "").toBe(
			'String must end with "bar"',
		);
	});

	it("validates includes", () => {
		const schema = Validator.string().includes("oob");
		expect(schema.is("foobar")).toBe(true);
		expect(schema.is("fbar")).toBe(false);
		expect(firstIssue(schema.safeParse("fbar"))?.message ?? "").toBe(
			'String must include "oob"',
		);
	});

	it("accepts custom messages", () => {
		expect(
			Validator.string().startsWith("a", "custom start").safeParse("b"),
		).toEqual({
			success: false,
			issues: [{ path: [], message: "custom start" }],
		});
	});
});

describe("string modifier combinations", () => {
	it("rejects short strings", () => {
		const schema = Validator.string().minLength(3).maxLength(5).email();
		expect(schema.is("ab")).toBe(false);
	});

	it("rejects invalid emails within constraints", () => {
		const schema = Validator.string().minLength(3).maxLength(5).email();
		expect(schema.is("abc@def")).toBe(false);
		expect(schema.is("a@b.c")).toBe(true);
		expect(schema.is("x".repeat(20))).toBe(false);
	});

	it("validates a realistic username", () => {
		const schema = Validator.string()
			.minLength(3)
			.maxLength(20)
			.pattern(/^[a-z0-9_]+$/);
		expect(schema.is("john_doe")).toBe(true);
		expect(schema.is("Jo")).toBe(false);
		expect(schema.is("has space")).toBe(false);
	});

	it("evaluates checks in order", () => {
		const schema = Validator.string().startsWith("a").includes("z");
		const result = schema.safeParse("axxx");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues[0].message).toBe(
				'String must include "z"',
			);
		}
	});

	it("does not mutate the original schema when chaining", () => {
		const base = Validator.string();
		const derived = base.minLength(5);
		expect(base.is("a")).toBe(true);
		expect(derived.is("a")).toBe(false);
		expect(base.kind).toBe("string");
		expect(derived.kind).toBe("string");
	});
});