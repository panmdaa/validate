import type { Schema } from "./core/types";
import type { EnumValue, LiteralValue, Shape } from "./schemas";
import type { ArraySchema, ObjectSchema } from "./schemas/compound";
import {
	arraySchema,
	discriminatedUnionSchema,
	objectSchema,
	recordSchema,
	tupleSchema,
	unionSchema,
} from "./schemas/compound";
import type { NumberSchema, StringSchema } from "./schemas/primitive";
import {
	anySchema,
	bigintSchema,
	booleanSchema,
	customSchema,
	enumSchema,
	literalSchema,
	neverSchema,
	numberSchema,
	stringSchema,
	unknownSchema,
} from "./schemas/primitive";

export const Validator = {
	string: (): StringSchema => stringSchema(),
	number: (): NumberSchema => numberSchema(),
	boolean: () => booleanSchema(),
	bigint: () => bigintSchema(),
	literal: <T extends LiteralValue>(value: T) => literalSchema(value),
	enum: <T extends EnumValue>(values: readonly T[]) => enumSchema(values),
	unknown: () => unknownSchema(),
	any: () => anySchema(),
	never: () => neverSchema(),
	custom: <T = unknown>(
		fn: (value: T) => boolean | string,
		message?: string,
	) => customSchema<T>(fn, message),
	object: <S extends Shape>(shape: S): ObjectSchema<S> => objectSchema(shape),
	array: <I extends Schema<any, any>>(item: I): ArraySchema<I> =>
		arraySchema(item),
	tuple: <T extends readonly Schema<any, any>[]>(items: [...T]) =>
		tupleSchema(items),
	union: <T extends readonly Schema<any, any>[]>(options: T) =>
		unionSchema(options),
	discriminatedUnion: <
		K extends string,
		O extends Record<string, Schema<any, any>>,
	>(
		key: K,
		options: O,
	) => discriminatedUnionSchema(key, options),
	record: <V extends Schema<any, any>>(value: V) => recordSchema(value),
};
