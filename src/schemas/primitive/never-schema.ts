import { createSchema } from "../../core/schema";
import type { Schema } from "../../core/types";

export function neverSchema(): Schema<never, never> {
	return createSchema<never, never>("never", null);
}
