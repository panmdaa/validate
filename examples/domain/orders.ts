import { Validator, type Infer } from "@panmdaa/validate";

const cardPayment = Validator.object({
	method: Validator.literal("card"),
	cardNumber: Validator.string().pattern(/^\d{16}$/),
	expiry: Validator.string().pattern(/^(0[1-9]|1[0-2])\/\d{2}$/),
	cvc: Validator.string().pattern(/^\d{3,4}$/),
});

const paypalPayment = Validator.object({
	method: Validator.literal("paypal"),
	email: Validator.string().email(),
});

const payment = Validator.discriminatedUnion("method", {
	card: cardPayment,
	paypal: paypalPayment,
});

const lineItem = Validator.object({
	sku: Validator.string().minLength(1),
	quantity: Validator.number().int().positive(),
	unitPrice: Validator.number().nonnegative(),
});

export const orderSchema = Validator.object({
	id: Validator.string().minLength(1),
	customer: Validator.string().minLength(1),
	items: Validator.array(lineItem).min(1),
	payment,
}).transform((order) => ({
	...order,
	total: order.items.reduce(
		(sum, item) => sum + item.quantity * item.unitPrice,
		0,
	),
}));

export type Order = Infer<typeof orderSchema>;
export type Payment = Infer<typeof payment>;

export function placeOrder(input: unknown): Order {
	const result = orderSchema.safeParse(input);
	if (!result.success) {
		throw new Error(`invalid order: ${result.issues[0].message}`);
	}
	return result.value;
}

export function describePayment(payment: Payment): string {
	switch (payment.method) {
		case "card":
			return `card ending in ${payment.cardNumber.slice(-4)}`;
		case "paypal":
			return `paypal account ${payment.email}`;
	}
}
