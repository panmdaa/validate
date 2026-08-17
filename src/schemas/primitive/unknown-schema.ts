import { createSchema } from "../../core/schema";
import type { Schema } from "../../core/types";

export function unknownSchema(): Schema<unknown, unknown> {
	return createSchema<unknown, unknown>("unknown", null);
}
