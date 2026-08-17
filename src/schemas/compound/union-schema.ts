import { createSchema } from "../../core/schema";
import type { Schema } from "../../core/types";
import type { UnionInput, UnionOutput } from "./types";

export function unionSchema<T extends readonly Schema<any, any>[]>(
	options: T,
): Schema<UnionInput<T>, UnionOutput<T>> {
	return createSchema<UnionInput<T>, UnionOutput<T>>("union", { options });
}
