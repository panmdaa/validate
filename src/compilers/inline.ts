import { detectTransforms } from "../core/detect-transforms";
import type { RunFn, SchemaNode } from "../core/types";
import type {
	CustomDef,
	EnumDef,
	LiteralDef,
	NumberDef,
	StringDef,
} from "../schemas/primitive/types";
import {
	buildAnyCheck,
	buildNeverCheck,
	buildUnknownCheck,
} from "./primitive/any-compiler";
import { buildBigIntCheck } from "./primitive/bigint-compiler";
import { buildBooleanCheck } from "./primitive/boolean-compiler";
import { buildCustomCheck } from "./primitive/custom-compiler";
import { buildEnumCheck } from "./primitive/enum-compiler";
import { buildLiteralCheck } from "./primitive/literal-compiler";
import { buildNumberCheck } from "./primitive/number-compiler";
import { buildStringCheck } from "./primitive/string-compiler";
import type { LeafCheck, NodeCompiler } from "./types";

export type ChildPlan =
	| { kind: "test"; test: LeafCheck; transforms: false }
	| { kind: "run"; run: RunFn; transforms: boolean };

export function inlineLeaf(node: SchemaNode): LeafCheck | null {
	switch (node.kind) {
		case "string":
			return buildStringCheck(node.def as StringDef);
		case "number":
			return buildNumberCheck(node.def as NumberDef);
		case "boolean":
			return buildBooleanCheck();
		case "bigint":
			return buildBigIntCheck();
		case "literal":
			return buildLiteralCheck(node.def as LiteralDef);
		case "enum":
			return buildEnumCheck(node.def as EnumDef);
		case "custom":
			return buildCustomCheck(node.def as CustomDef);
		case "unknown":
			return buildUnknownCheck();
		case "any":
			return buildAnyCheck();
		case "never":
			return buildNeverCheck();
		case "optional": {
			const inner = inlineLeaf((node.def as { inner: SchemaNode }).inner);
			if (inner === null) return null;
			return (value) => (value === undefined ? true : inner(value));
		}
		case "nullable": {
			const inner = inlineLeaf((node.def as { inner: SchemaNode }).inner);
			if (inner === null) return null;
			return (value) => (value === null ? true : inner(value));
		}
		default:
			return null;
	}
}

export function childPlan(node: SchemaNode, compile: NodeCompiler): ChildPlan {
	const test = inlineLeaf(node);
	if (test !== null) {
		return { kind: "test", test, transforms: false };
	}
	return {
		kind: "run",
		run: compile(node),
		transforms: detectTransforms(node),
	};
}
