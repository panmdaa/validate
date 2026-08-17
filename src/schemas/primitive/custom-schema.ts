import { createSchema } from "../../core/schema";
import type { Schema } from "../../core/types";
import type { CustomFn } from "./types";

export function customSchema<T = unknown>(
	fn: CustomFn,
	message = "Invalid value",
): Schema<T, T> {
	return createSchema<T, T>("custom", { fn, message });
}
