import { createSchema } from "../../core/schema";
import type { Schema } from "../../core/types";

export function bigintSchema(): Schema<bigint, bigint> {
	return createSchema<bigint, bigint>("bigint", null);
}
