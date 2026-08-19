import { Validator, type Infer, type Input, type Output } from "@panmdaa/validate";

export const productSchema = Validator.object({
	id: Validator.string().minLength(1),
	title: Validator.string().minLength(1).maxLength(120),
	price: Validator.number().nonnegative(),
	inStock: Validator.boolean().default(true),
	sku: Validator.string().optional(),
});

// Infer is the validated output (defaults and transforms applied)
export type Product = Infer<typeof productSchema>;
// {
//   id: string;
//   title: string;
//   price: number;
//   inStock: boolean;
//   sku: string | undefined;
// }

// Input is what the schema accepts (before defaults and transforms)
export type ProductInput = Input<typeof productSchema>;
// {
//   id: string;
//   title: string;
//   price: number;
//   inStock?: boolean | undefined;
//   sku?: string | undefined;
// }

// Output is an alias of Infer
export type ProductOutput = Output<typeof productSchema>;

export function toDto(product: Product): { id: string; title: string; priceCents: number } {
	return {
		id: product.id,
		title: product.title,
		priceCents: Math.round(product.price * 100),
	};
}

export function acceptProductInput(input: ProductInput): Product {
	const result = productSchema.safeParse(input);
	if (!result.success) {
		throw new Error(`invalid product: ${result.issues[0].message}`);
	}
	return result.value;
}

const apiResponseSchema = Validator.union([
	Validator.object({ ok: Validator.literal(true), data: Validator.unknown() }),
	Validator.object({ ok: Validator.literal(false), error: Validator.string() }),
]);

export type ApiResponse = Infer<typeof apiResponseSchema>;
// { ok: true; data: unknown } | { ok: false; error: string }

export function handleApiResponse(response: unknown): string {
	const parsed = apiResponseSchema.safeParse(response);
	if (!parsed.success) {
		return `unexpected response shape: ${parsed.issues[0].message}`;
	}
	return parsed.value.ok
		? "request succeeded"
		: `request failed: ${parsed.value.error}`;
}

export type UserId = "user" | "admin";
export const userIdSchema = Validator.enum(["user", "admin"]);
export type UserIdFromSchema = Infer<typeof userIdSchema>; // "user" | "admin"

export function parseUserId(value: unknown): UserId {
	const result = userIdSchema.safeParse(value);
	if (!result.success) {
		throw new Error(`invalid user id: ${result.issues[0].message}`);
	}
	return result.value; // narrowed to "user" | "admin"
}
