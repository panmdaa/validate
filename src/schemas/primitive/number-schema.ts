import { createSchema, withMethods } from "../../core/schema";
import type { Schema } from "../../core/types";
import type { NumberCheck, NumberDef } from "./types";

export interface NumberSchema extends Schema<number, number> {
	int(message?: string): NumberSchema;
	finite(message?: string): NumberSchema;
	safe(message?: string): NumberSchema;
	min(n: number, message?: string): NumberSchema;
	max(n: number, message?: string): NumberSchema;
	positive(message?: string): NumberSchema;
	negative(message?: string): NumberSchema;
	nonnegative(message?: string): NumberSchema;
	nonpositive(message?: string): NumberSchema;
}

export function numberSchema(def: NumberDef = { checks: [] }): NumberSchema {
	const base = createSchema<number, number>("number", def);
	const withCheck = (check: NumberCheck): NumberSchema =>
		numberSchema({ checks: [...def.checks, check] });
	const methods = {
		int: (message = "Expected an integer"): NumberSchema =>
			withCheck({ type: "int", message }),
		finite: (message = "Expected a finite number"): NumberSchema =>
			withCheck({ type: "finite", message }),
		safe: (message = "Expected a safe integer"): NumberSchema =>
			withCheck({ type: "safe", message }),
		min: (n: number, message?: string): NumberSchema =>
			withCheck({
				type: "min",
				n,
				message: message ?? `Number must be >= ${n}`,
			}),
		max: (n: number, message?: string): NumberSchema =>
			withCheck({
				type: "max",
				n,
				message: message ?? `Number must be <= ${n}`,
			}),
		positive: (message = "Number must be positive"): NumberSchema =>
			withCheck({ type: "positive", message }),
		negative: (message = "Number must be negative"): NumberSchema =>
			withCheck({ type: "negative", message }),
		nonnegative: (message = "Number must be non-negative"): NumberSchema =>
			withCheck({ type: "nonnegative", message }),
		nonpositive: (message = "Number must be non-positive"): NumberSchema =>
			withCheck({ type: "nonpositive", message }),
	};
	return withMethods(base, methods) as NumberSchema;
}
