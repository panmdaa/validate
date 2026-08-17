import { createSchema } from "../../core/schema";
import type { Schema } from "../../core/types";
import type { LiteralValue } from "./types";

export function literalSchema<T extends LiteralValue>(value: T): Schema<T, T> {
	return createSchema<T, T>("literal", { value });
}
