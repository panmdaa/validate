import { createSchema } from "../../core/schema";
import type { Infer, Input, Schema } from "../../core/types";

export function recordSchema<V extends Schema<any, any>>(
	value: V,
): Schema<Record<string, Input<V>>, Record<string, Infer<V>>> {
	return createSchema<Record<string, Input<V>>, Record<string, Infer<V>>>(
		"record",
		{ value },
	);
}
