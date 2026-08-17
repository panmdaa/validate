import { createSchema, withMethods } from "../../core/schema";
import type { Infer, Input, Schema } from "../../core/types";
import type { ArrayCheck } from "./types";

export interface ArraySchema<I extends Schema<any, any>>
	extends Schema<Input<I>[], Infer<I>[]> {
	min(n: number, message?: string): ArraySchema<I>;
	max(n: number, message?: string): ArraySchema<I>;
	length(n: number, message?: string): ArraySchema<I>;
}

export function arraySchema<I extends Schema<any, any>>(
	item: I,
	checks: ArrayCheck[] = [],
): ArraySchema<I> {
	const base = createSchema<Input<I>[], Infer<I>[]>("array", { item, checks });
	const methods = {
		min: (n: number, message?: string): ArraySchema<I> =>
			arraySchema(item, [
				...checks,
				{
					type: "min",
					n,
					message: message ?? `Array must contain at least ${n} item(s)`,
				},
			]),
		max: (n: number, message?: string): ArraySchema<I> =>
			arraySchema(item, [
				...checks,
				{
					type: "max",
					n,
					message: message ?? `Array must contain at most ${n} item(s)`,
				},
			]),
		length: (n: number, message?: string): ArraySchema<I> =>
			arraySchema(item, [
				...checks,
				{
					type: "length",
					n,
					message: message ?? `Array must contain exactly ${n} item(s)`,
				},
			]),
	};
	return withMethods(base, methods) as ArraySchema<I>;
}
