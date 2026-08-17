import type { SchemaNode } from "../../core/types";

export interface WrapperDef {
	inner: SchemaNode;
}

export interface DefaultDef extends WrapperDef {
	value: unknown;
}

export interface TransformDef extends WrapperDef {
	fn: (value: unknown) => unknown;
}

export interface RefineDef extends WrapperDef {
	fn: (value: unknown) => boolean | string;
	message: string;
}
