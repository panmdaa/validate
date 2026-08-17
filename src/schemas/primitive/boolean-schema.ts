import { createSchema } from "../../core/schema";
import type { Schema } from "../../core/types";

export function booleanSchema(): Schema<boolean, boolean> {
	return createSchema<boolean, boolean>("boolean", null);
}
