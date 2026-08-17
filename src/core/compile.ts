import { compileArray } from "../compilers/compound/array-compiler";
import { compileDiscriminatedUnion } from "../compilers/compound/discriminated-union-compiler";
import { compileObject } from "../compilers/compound/object-compiler";
import { compileRecord } from "../compilers/compound/record-compiler";
import { compileTuple } from "../compilers/compound/tuple-compiler";
import { compileUnion } from "../compilers/compound/union-compiler";
import {
	compileAny,
	compileNever,
	compileUnknown,
} from "../compilers/primitive/any-compiler";
import { compileBigInt } from "../compilers/primitive/bigint-compiler";
import { compileBoolean } from "../compilers/primitive/boolean-compiler";
import { compileCustom } from "../compilers/primitive/custom-compiler";
import { compileEnum } from "../compilers/primitive/enum-compiler";
import { compileLiteral } from "../compilers/primitive/literal-compiler";
import { compileNumber } from "../compilers/primitive/number-compiler";
import { compileString } from "../compilers/primitive/string-compiler";
import {
	compileDefault,
	compileNullable,
	compileOptional,
	compileRefine,
	compileTransform,
} from "../compilers/wrappers/wrappers-compiler";
import type { RunFn, SchemaNode } from "./types";

export function compile(node: SchemaNode): RunFn {
	switch (node.kind) {
		case "string":
			return compileString(node);
		case "number":
			return compileNumber(node);
		case "boolean":
			return compileBoolean(node);
		case "bigint":
			return compileBigInt(node);
		case "literal":
			return compileLiteral(node);
		case "enum":
			return compileEnum(node);
		case "custom":
			return compileCustom(node);
		case "unknown":
			return compileUnknown(node);
		case "any":
			return compileAny(node);
		case "never":
			return compileNever(node);
		case "object":
			return compileObject(node, compile);
		case "array":
			return compileArray(node, compile);
		case "tuple":
			return compileTuple(node, compile);
		case "union":
			return compileUnion(node, compile);
		case "discriminatedUnion":
			return compileDiscriminatedUnion(node, compile);
		case "record":
			return compileRecord(node, compile);
		case "optional":
			return compileOptional(node, compile);
		case "nullable":
			return compileNullable(node, compile);
		case "default":
			return compileDefault(node, compile);
		case "transform":
			return compileTransform(node, compile);
		case "refine":
			return compileRefine(node, compile);
		default:
			throw new Error(`No compiler for schema kind "${node.kind}"`);
	}
}
