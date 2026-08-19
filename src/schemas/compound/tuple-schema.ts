import { createSchema } from "../../core/schema";
import type { Schema } from "../../core/types";
import type { TupleInput, TupleOutput } from "./types";

export function tupleSchema<T extends readonly Schema<any, any>[]>(
	items: [...T],
): Schema<TupleInput<T>, TupleOutput<T>> {
	return createSchema<TupleInput<T>, TupleOutput<T>>("tuple", { items });
}
