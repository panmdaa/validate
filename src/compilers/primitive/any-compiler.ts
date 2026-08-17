import { leafRun } from "../leaf";
import type { LeafCheck, NodeCompiler } from "../types";

export function buildUnknownCheck(): LeafCheck {
	return () => true;
}

export function buildAnyCheck(): LeafCheck {
	return () => true;
}

export function buildNeverCheck(): LeafCheck {
	return () => ({ message: "Expected never" });
}

export const compileUnknown: NodeCompiler = (_node) =>
	leafRun(buildUnknownCheck());

export const compileAny: NodeCompiler = (_node) => leafRun(buildAnyCheck());

export const compileNever: NodeCompiler = (_node) => leafRun(buildNeverCheck());
