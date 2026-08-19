import { createSchema } from "../../core/schema";
import type { Schema } from "../../core/types";

export function customSchema<T = unknown>(
	fn: (value: T) => boolean | string,
	message = "Invalid value",
): Schema<T, T> {
	return createSchema<T, T>("custom", { fn, message });
}
