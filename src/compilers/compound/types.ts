import type { SchemaNode } from "../../core/types";
import type { ArrayCheck, ObjectMode } from "../../schemas/compound/types";
import type { CompositeCompiler } from "../types";

export interface ObjectCompilerDef {
	shape: Record<string, SchemaNode>;
	mode: ObjectMode;
}
export type ObjectCompiler = CompositeCompiler;

export interface ArrayCompilerDef {
	item: SchemaNode;
	checks: ArrayCheck[];
}
export type ArrayCompiler = CompositeCompiler;

export interface TupleCompilerDef {
	items: readonly SchemaNode[];
}
export type TupleCompiler = CompositeCompiler;

export interface UnionCompilerDef {
	options: readonly SchemaNode[];
}
export type UnionCompiler = CompositeCompiler;

export interface DiscriminatedUnionCompilerDef {
	key: string;
	options: Record<string, SchemaNode>;
}
export type DiscriminatedUnionCompiler = CompositeCompiler;

export interface RecordCompilerDef {
	value: SchemaNode;
}
export type RecordCompiler = CompositeCompiler;
