import { createSchema } from "../../core/schema";
import type { Schema } from "../../core/types";

export function anySchema(): Schema<any, any> {
	return createSchema<any, any>("any", null);
}
