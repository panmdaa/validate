export type StringCheck =
	| { type: "minLength"; n: number; message: string }
	| { type: "maxLength"; n: number; message: string }
	| { type: "length"; n: number; message: string }
	| { type: "pattern"; re: RegExp; message: string }
	| { type: "email"; message: string }
	| { type: "url"; message: string }
	| { type: "startsWith"; s: string; message: string }
	| { type: "endsWith"; s: string; message: string }
	| { type: "includes"; s: string; message: string };

export interface StringDef {
	checks: StringCheck[];
}

export type NumberCheck =
	| { type: "int"; message: string }
	| { type: "finite"; message: string }
	| { type: "safe"; message: string }
	| { type: "min"; n: number; message: string }
	| { type: "max"; n: number; message: string }
	| { type: "positive"; message: string }
	| { type: "negative"; message: string }
	| { type: "nonnegative"; message: string }
	| { type: "nonpositive"; message: string };

export interface NumberDef {
	checks: NumberCheck[];
}

export type LiteralValue =
	| string
	| number
	| boolean
	| bigint
	| null
	| undefined;

export interface LiteralDef {
	value: LiteralValue;
}

export type EnumValue = string | number | boolean;

export interface EnumDef {
	values: readonly EnumValue[];
}

export type CustomFn = (value: unknown) => boolean | string;

export interface CustomDef {
	fn: CustomFn;
	message: string;
}
