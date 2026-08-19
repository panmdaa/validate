import { describe, expect, expectTypeOf, it } from "vitest";
import {
	type Infer,
	type Input,
	type Output,
	Validator,
} from "../src/index";

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

describe("primitive type inference", () => {
	it("infers primitives", () => {
		expectTypeOf<Infer<ReturnType<typeof Validator.string>>>().toEqualTypeOf<string>();
		expectTypeOf<Infer<ReturnType<typeof Validator.number>>>().toEqualTypeOf<number>();
		expectTypeOf<Infer<ReturnType<typeof Validator.boolean>>>().toEqualTypeOf<boolean>();
		expectTypeOf<Infer<ReturnType<typeof Validator.bigint>>>().toEqualTypeOf<bigint>();
		expectTypeOf<Infer<ReturnType<typeof Validator.unknown>>>().toEqualTypeOf<unknown>();
		expectTypeOf<Infer<ReturnType<typeof Validator.any>>>().toEqualTypeOf<any>();
	});

	it("infers literals and enums", () => {
		const lit = Validator.literal("on");
		expectTypeOf<Infer<typeof lit>>().toEqualTypeOf<"on">();
		expectTypeOf<Input<typeof lit>>().toEqualTypeOf<"on">();

		const num = Validator.literal(42);
		expectTypeOf<Infer<typeof num>>().toEqualTypeOf<42>();

		const flag = Validator.literal(true);
		expectTypeOf<Infer<typeof flag>>().toEqualTypeOf<true>();

		const empty = Validator.literal(null);
		expectTypeOf<Infer<typeof empty>>().toEqualTypeOf<null>();

		const big = Validator.literal(10n);
		expectTypeOf<Infer<typeof big>>().toEqualTypeOf<10n>();

		const en = Validator.enum(["a", "b", "c"]);
		expectTypeOf<Infer<typeof en>>().toEqualTypeOf<"a" | "b" | "c">();
	});

	it("infers custom schema types", () => {
		const schema = Validator.custom<{ id: number }>((v) => {
			return typeof v === "object" && v !== null;
		});
		expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<{ id: number }>();
	});
});

describe("modifier type inference", () => {
	it("infers optional and nullable", () => {
		const optional = Validator.string().optional();
		expectTypeOf<Infer<typeof optional>>().toEqualTypeOf<string | undefined>();
		expectTypeOf<Input<typeof optional>>().toEqualTypeOf<string | undefined>();

		const nullable = Validator.string().nullable();
		expectTypeOf<Infer<typeof nullable>>().toEqualTypeOf<string | null>();
		expectTypeOf<Input<typeof nullable>>().toEqualTypeOf<string | null>();
	});

	it("infers default", () => {
		const schema = Validator.string().default("x");
		expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<string>();
		expectTypeOf<Input<typeof schema>>().toEqualTypeOf<string | undefined>();
	});

	it("infers transform output", () => {
		const schema = Validator.string().transform((s) => s.length);
		expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<number>();
		expectTypeOf<Input<typeof schema>>().toEqualTypeOf<string>();
		expectTypeOf<Output<typeof schema>>().toEqualTypeOf<number>();
	});

	it("infers refine as identity", () => {
		const schema = Validator.number().refine((n) => n > 0);
		expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<number>();
		expectTypeOf<Input<typeof schema>>().toEqualTypeOf<number>();
	});

	it("infers chained wrapper pipelines", () => {
		const schema = Validator.number().optional().default(0).transform((n) => `n=${n}`);
		expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<string>();
		expectTypeOf<Input<typeof schema>>().toEqualTypeOf<number | undefined>();
	});
});

describe("compound type inference", () => {
	it("infers object shapes", () => {
		const schema = Validator.object({
			name: Validator.string(),
			age: Validator.number().int(),
			tags: Validator.array(Validator.string()).optional(),
		});
		expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<{
			name: string;
			age: number;
			tags: string[] | undefined;
		}>();
		expectTypeOf<Input<typeof schema>>().toEqualTypeOf<{
			name: string;
			age: number;
			tags: string[] | undefined;
		}>();
	});

	it("infers object fields with transforms", () => {
		const schema = Validator.object({
			id: Validator.number(),
			label: Validator.string().transform((s) => s.length),
		});
		expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<{
			id: number;
			label: number;
		}>();
	});

	it("infers nested objects", () => {
		const schema = Validator.object({
			user: Validator.object({ id: Validator.number() }),
		});
		expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<{
			user: { id: number };
		}>();
	});

	it("infers arrays and tuples", () => {
		const arr = Validator.array(Validator.number());
		expectTypeOf<Infer<typeof arr>>().toEqualTypeOf<number[]>();

		const tup = Validator.tuple([Validator.string(), Validator.number()]);
		const tupEqual: Equal<Infer<typeof tup>, [string, number]> = true;

		const mixed = Validator.tuple([
			Validator.string(),
			Validator.number().transform((n) => String(n)),
		]);
		const mixedEqual: Equal<Infer<typeof mixed>, [string, string]> = true;
	});

	it("infers unions", () => {
		const schema = Validator.union([
			Validator.string(),
			Validator.number(),
			Validator.literal(true),
		]);
		expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<
			string | number | true
		>();
	});

	it("infers discriminated unions", () => {
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
		const discEqual: Equal<
			Infer<typeof schema>,
			| { type: "user"; name: string }
			| { type: "admin"; level: number }
		> = true;
	});

	it("infers records", () => {
		const schema = Validator.record(Validator.number());
		expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<
			Record<string, number>
		>();
	});
});

describe("Infer on complex pipelines", () => {
	it("infers a full user model", () => {
		const schema = Validator.object({
			id: Validator.number().int(),
			email: Validator.string().email(),
			role: Validator.enum(["admin", "user"]),
			meta: Validator.record(Validator.string())
				.optional()
				.default({} as Record<string, string>),
			posts: Validator.array(
				Validator.object({
					title: Validator.string(),
					likes: Validator.number().default(0),
				}),
			),
		});
		type Model = Infer<typeof schema>;
		expectTypeOf<Model>().toEqualTypeOf<{
			id: number;
			email: string;
			role: "admin" | "user";
			meta: Record<string, string>;
			posts: { title: string; likes: number }[];
		}>();
	});

	it("schema is assignable to its inferred output", () => {
		const schema = Validator.object({ n: Validator.number() });
		const out: Infer<typeof schema> = { n: 1 };
		expect(out).toEqual({ n: 1 });
	});
});

describe("runtime type-guard usage", () => {
	it("narrows inside conditionals", () => {
		const schema = Validator.object({ id: Validator.number() });
		const value: unknown = { id: 1 };
		if (schema.is(value)) {
			expect(value.id).toBe(1);
		}
		expect(schema.is(value)).toBe(true);
	});
});