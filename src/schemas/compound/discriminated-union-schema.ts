import { createSchema } from "../../core/schema";
import type { Schema } from "../../core/types";
import type {
	DiscriminatedUnionInput,
	DiscriminatedUnionOutput,
} from "./types";

export function discriminatedUnionSchema<
	K extends string,
	O extends Record<string, Schema<any, any>>,
>(
	key: K,
	options: O,
): Schema<DiscriminatedUnionInput<K, O>, DiscriminatedUnionOutput<K, O>> {
	return createSchema<
		DiscriminatedUnionInput<K, O>,
		DiscriminatedUnionOutput<K, O>
	>("discriminatedUnion", { key, options });
}
