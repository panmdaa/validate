import { createSchema } from "../../core/schema";
import type { Schema } from "../../core/types";
import type { EnumValue } from "./types";

export function enumSchema<T extends EnumValue>(
	values: readonly T[],
): Schema<T, T> {
	return createSchema<T, T>("enum", { values });
}
