import type { Infer, Input, Schema } from "../../core/types";

export type ObjectMode = "strip" | "passthrough" | "strict";

export type Shape = Record<string, Schema<any, any>>;

export type ObjectInput<S extends Shape> = {
	[K in keyof S]: Input<S[K]>;
};

export type ObjectOutput<S extends Shape> = {
	[K in keyof S]: Infer<S[K]>;
};

export interface ObjectDef<S extends Shape> {
	shape: S;
	mode: ObjectMode;
}

export type ArrayCheck =
	| { type: "min"; n: number; message: string }
	| { type: "max"; n: number; message: string }
	| { type: "length"; n: number; message: string };

export interface ArrayDef {
	item: Schema<any, any>;
	checks: ArrayCheck[];
}

export type TupleInput<T extends readonly Schema<any, any>[]> = {
	[K in keyof T]: Input<T[K]>;
};

export type TupleOutput<T extends readonly Schema<any, any>[]> = {
	[K in keyof T]: Infer<T[K]>;
};

export interface TupleDef<T extends readonly Schema<any, any>[]> {
	items: T;
}

export type UnionInput<T extends readonly Schema<any, any>[]> = Input<
	T[number]
>;

export type UnionOutput<T extends readonly Schema<any, any>[]> = Infer<
	T[number]
>;

export interface UnionDef<T extends readonly Schema<any, any>[]> {
	options: T;
}

export type DiscriminatedUnionInput<
	K extends string,
	O extends Record<string, Schema<any, any>>,
> = {
	[T in keyof O]: { [P in K]: T } & Input<O[T]>;
}[keyof O];

export type DiscriminatedUnionOutput<
	K extends string,
	O extends Record<string, Schema<any, any>>,
> = {
	[T in keyof O]: { [P in K]: T } & Infer<O[T]>;
}[keyof O];

export interface DiscriminatedUnionDef<
	K extends string,
	O extends Record<string, Schema<any, any>>,
> {
	key: K;
	options: O;
}

export interface RecordDef<V extends Schema<any, any>> {
	value: V;
}
