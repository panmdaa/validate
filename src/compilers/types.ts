import type { RunFn, SchemaNode } from "../core/types";

export type Compiler<D> = (def: D) => RunFn;
export type NodeCompiler = (node: SchemaNode) => RunFn;
export type CompositeCompiler = (
	node: SchemaNode,
	compile: NodeCompiler,
) => RunFn;

export interface LeafIssue {
	message: string;
	expected?: string;
	received?: unknown;
}

export type LeafCheck = (value: unknown) => true | LeafIssue;
