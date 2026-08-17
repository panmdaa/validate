import { createSchema, withMethods } from "../../core/schema";
import type { Schema } from "../../core/types";
import type { ObjectInput, ObjectMode, ObjectOutput, Shape } from "./types";

export interface ObjectSchema<S extends Shape>
	extends Schema<ObjectInput<S>, ObjectOutput<S>> {
	passthrough(): ObjectSchema<S>;
	strip(): ObjectSchema<S>;
	strict(): ObjectSchema<S>;
}

export function objectSchema<S extends Shape>(
	shape: S,
	mode: ObjectMode = "strip",
): ObjectSchema<S> {
	const base = createSchema<ObjectInput<S>, ObjectOutput<S>>("object", {
		shape,
		mode,
	});
	const methods = {
		passthrough: (): ObjectSchema<S> => objectSchema(shape, "passthrough"),
		strip: (): ObjectSchema<S> => objectSchema(shape, "strip"),
		strict: (): ObjectSchema<S> => objectSchema(shape, "strict"),
	};
	return withMethods(base, methods) as ObjectSchema<S>;
}
