import { inlineLeaf } from "../compilers/inline";
import type {
	LiteralDef,
	LiteralValue,
	NumberDef,
	StringDef,
} from "../schemas/primitive/types";
import { FAIL } from "./constants";
import { detectTransforms } from "./detect-transforms";
import { fail } from "./run";
import type { RunFn, SchemaNode } from "./types";

interface ObjectDef {
	shape: Record<string, SchemaNode>;
	mode: "strip" | "strict" | "passthrough";
}

interface ArrayDef {
	item: SchemaNode;
	checks: ArrayCheck[];
}

type ArrayCheck =
	| { type: "min"; n: number; message: string }
	| { type: "max"; n: number; message: string }
	| { type: "length"; n: number; message: string };

interface TupleDef {
	items: readonly SchemaNode[];
}

interface UnionDef {
	options: readonly SchemaNode[];
}

interface DiscriminatedUnionDef {
	key: string;
	options: Record<string, SchemaNode>;
}

interface RecordDef {
	value: SchemaNode;
}

interface WrapperDef {
	inner: SchemaNode;
}

interface DefaultDef extends WrapperDef {
	value: unknown;
}

interface TransformDef extends WrapperDef {
	fn: (value: unknown) => unknown;
}

interface RefineDef extends WrapperDef {
	fn: (value: unknown) => boolean | string;
	message: string;
}

type FM = { kind: "hard" } | { kind: "soft"; ok: string; label: string };

function q(value: string): string {
	return JSON.stringify(value);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isUrl(value: unknown): boolean {
	try {
		new URL(value as string);
		return true;
	} catch {
		return false;
	}
}

function litExpr(value: LiteralValue): string {
	switch (typeof value) {
		case "string":
			return q(value);
		case "number":
			return String(value);
		case "boolean":
			return value ? "true" : "false";
		case "bigint":
			return `${value}n`;
		case "undefined":
			return "undefined";
		default:
			return "null";
	}
}

class Gen {
	externals: unknown[] = [];
	src: string[] = [];
	temp = 0;

	add(value: unknown): string {
		const name = `$e${this.externals.length}`;
		this.externals.push(value);
		return name;
	}

	tmp(prefix: string): string {
		return `${prefix}${this.temp++}`;
	}

	emit(line: string): void {
		this.src.push(line);
	}

	failStmt(
		fm: FM,
		message: string,
		expected?: string,
		received?: string,
	): void {
		if (fm.kind === "hard") {
			this.emit(
				`return $fail(ctx, ${message}${expected ? `, ${expected}` : ""}${
					received ? `, ${received}` : ""
				});`,
			);
		} else {
			this.emit(`${fm.ok} = false;`);
			this.emit(`break ${fm.label};`);
		}
	}

	leafFail(fm: FM, r: string, pathExpr: string | null): void {
		if (fm.kind === "hard") {
			if (pathExpr !== null) this.emit(`ctx.path.push(${pathExpr});`);
			this.emit(`$fail(ctx, ${r}.message, ${r}.expected, ${r}.received);`);
			if (pathExpr !== null) this.emit(`ctx.path.pop();`);
			this.emit(`return $FAIL;`);
		} else {
			this.emit(`${fm.ok} = false;`);
			this.emit(`break ${fm.label};`);
		}
	}

	hardFail(
		fm: FM,
		pathExpr: string | null,
		message: string,
		expected?: string,
		received?: string,
	): void {
		if (fm.kind === "soft") {
			this.emit(`${fm.ok} = false;`);
			this.emit(`break ${fm.label};`);
			return;
		}
		if (pathExpr !== null) this.emit(`ctx.path.push(${pathExpr});`);
		this.emit(
			`$fail(ctx, ${message}${expected ? `, ${expected}` : ""}${
				received ? `, ${received}` : ""
			});`,
		);
		if (pathExpr !== null) this.emit(`ctx.path.pop();`);
		this.emit(`return $FAIL;`);
	}

	leaf(
		node: SchemaNode,
		varName: string,
		fm: FM,
		pathExpr: string | null,
	): void {
		switch (node.kind) {
			case "string":
			case "number":
			case "boolean":
			case "bigint":
			case "literal":
			case "unknown":
			case "any":
			case "never":
				this.inlineLeafGen(node, varName, fm, pathExpr);
				return;
			default:
				this.leafClosure(node, varName, fm, pathExpr);
		}
	}

	inlineLeafGen(
		node: SchemaNode,
		varName: string,
		fm: FM,
		pathExpr: string | null,
	): void {
		switch (node.kind) {
			case "string": {
				const def = node.def as StringDef;
				this.emit(`if (typeof ${varName} !== "string") {`);
				this.hardFail(fm, pathExpr, q("Expected string"), q("string"), varName);
				this.emit(`}`);
				for (const c of def.checks) {
					let cond: string;
					switch (c.type) {
						case "minLength":
							cond = `${varName}.length < ${c.n}`;
							break;
						case "maxLength":
							cond = `${varName}.length > ${c.n}`;
							break;
						case "length":
							cond = `${varName}.length !== ${c.n}`;
							break;
						case "pattern": {
							const re = this.add(c.re);
							cond = `(${re}.lastIndex = 0, !${re}.test(${varName}))`;
							break;
						}
						case "email":
							cond = `!${this.add(EMAIL_RE)}.test(${varName})`;
							break;
						case "url":
							cond = `!${this.add(isUrl)}(${varName})`;
							break;
						case "startsWith":
							cond = `!${varName}.startsWith(${q(c.s)})`;
							break;
						case "endsWith":
							cond = `!${varName}.endsWith(${q(c.s)})`;
							break;
						case "includes":
							cond = `!${varName}.includes(${q(c.s)})`;
							break;
					}
					this.emit(`if (${cond}) {`);
					this.hardFail(fm, pathExpr, q(c.message));
					this.emit(`}`);
				}
				return;
			}
			case "number": {
				const def = node.def as NumberDef;
				this.emit(
					`if (typeof ${varName} !== "number" || ${varName} !== ${varName}) {`,
				);
				this.hardFail(fm, pathExpr, q("Expected number"), q("number"), varName);
				this.emit(`}`);
				for (const c of def.checks) {
					let cond: string;
					switch (c.type) {
						case "int":
							cond = `!Number.isInteger(${varName})`;
							break;
						case "finite":
							cond = `!Number.isFinite(${varName})`;
							break;
						case "safe":
							cond = `!Number.isSafeInteger(${varName})`;
							break;
						case "min":
							cond = `${varName} < ${c.n}`;
							break;
						case "max":
							cond = `${varName} > ${c.n}`;
							break;
						case "positive":
							cond = `${varName} <= 0`;
							break;
						case "negative":
							cond = `${varName} >= 0`;
							break;
						case "nonnegative":
							cond = `${varName} < 0`;
							break;
						case "nonpositive":
							cond = `${varName} > 0`;
							break;
					}
					this.emit(`if (${cond}) {`);
					this.hardFail(fm, pathExpr, q(c.message));
					this.emit(`}`);
				}
				return;
			}
			case "boolean":
				this.emit(`if (typeof ${varName} !== "boolean") {`);
				this.hardFail(
					fm,
					pathExpr,
					q("Expected boolean"),
					q("boolean"),
					varName,
				);
				this.emit(`}`);
				return;
			case "bigint":
				this.emit(`if (typeof ${varName} !== "bigint") {`);
				this.hardFail(fm, pathExpr, q("Expected bigint"), q("bigint"), varName);
				this.emit(`}`);
				return;
			case "literal": {
				const def = node.def as LiteralDef;
				this.emit(`if (${varName} !== ${litExpr(def.value)}) {`);
				this.hardFail(
					fm,
					pathExpr,
					q("Invalid literal"),
					q(String(def.value)),
					varName,
				);
				this.emit(`}`);
				return;
			}
			case "unknown":
			case "any":
				return;
			case "never":
				this.hardFail(fm, pathExpr, q("Expected never"));
				return;
			default:
				throw new Error(`Cannot inline leaf kind "${node.kind}"`);
		}
	}

	leafClosure(
		node: SchemaNode,
		varName: string,
		fm: FM,
		pathExpr: string | null,
	): void {
		const check = inlineLeaf(node);
		if (check === null) {
			throw new Error(`Expected leaf node, got "${node.kind}"`);
		}
		const expr = this.add(check);
		const r = this.tmp("$r");
		this.emit(`var ${r} = ${expr}(${varName});`);
		this.emit(`if (${r} !== true) {`);
		this.leafFail(fm, r, pathExpr);
		this.emit(`}`);
	}

	optional(node: SchemaNode, varName: string, fm: FM): void {
		const inner = (node.def as WrapperDef).inner;
		this.emit(`if (${varName} !== undefined) {`);
		this.node(inner, varName, fm);
		this.emit(`}`);
	}

	nullable(node: SchemaNode, varName: string, fm: FM): void {
		const inner = (node.def as WrapperDef).inner;
		this.emit(`if (${varName} !== null) {`);
		this.node(inner, varName, fm);
		this.emit(`}`);
	}

	default(node: SchemaNode, varName: string, fm: FM): void {
		const def = node.def as DefaultDef;
		const inner = def.inner;
		const fallback =
			typeof def.value === "function"
				? (def.value as () => unknown)()
				: def.value;
		const fallbackExpr = this.add(fallback);
		this.emit(`if (${varName} === undefined) {`);
		this.emit(`  ${varName} = ${fallbackExpr};`);
		this.emit(`} else {`);
		this.node(inner, varName, fm);
		this.emit(`}`);
	}

	transform(node: SchemaNode, varName: string, fm: FM): void {
		const def = node.def as TransformDef;
		const fnExpr = this.add(def.fn);
		this.node(def.inner, varName, fm);
		this.emit(`${varName} = ${fnExpr}(${varName});`);
	}

	refine(node: SchemaNode, varName: string, fm: FM): void {
		const def = node.def as RefineDef;
		const fnExpr = this.add(def.fn);
		const r = this.tmp("$rf");
		this.node(def.inner, varName, fm);
		this.emit(`var ${r} = ${fnExpr}(${varName});`);
		this.emit(`if (${r} !== true) {`);
		this.failStmt(fm, `typeof ${r} === "string" ? ${r} : ${q(def.message)}`);
		this.emit(`}`);
	}

	object(node: SchemaNode, varName: string, fm: FM): void {
		const def = node.def as ObjectDef;
		const shape = def.shape;
		const keys = Object.keys(shape);
		const mode = def.mode;
		const allRequired = keys.every((key) => shape[key].kind !== "optional");
		const transforms = keys.some((key) => detectTransforms(shape[key]));

		this.emit(
			`if (typeof ${varName} !== "object" || ${varName} === null || Array.isArray(${varName})) {`,
		);
		this.failStmt(fm, q("Expected object"), q("object"), varName);
		this.emit(`}`);

		if (mode === "strict") {
			const shapeExpr = this.add(shape);
			const sk = this.tmp("$sk");
			const si = this.tmp("$si");
			const sKey = this.tmp("$skey");
			this.emit(`var ${sk} = Object.keys(${varName});`);
			this.emit(`for (var ${si} = 0; ${si} < ${sk}.length; ${si}++) {`);
			this.emit(`  var ${sKey} = ${sk}[${si}];`);
			this.emit(`  if (!Object.hasOwn(${shapeExpr}, ${sKey})) {`);
			this.failStmt(fm, `"Unexpected key: " + ${sKey}`);
			this.emit(`  }`);
			this.emit(`}`);
		}

		if (!transforms) {
			if (mode === "strip" && allRequired) {
				this.emit(`if (Object.keys(${varName}).length === ${keys.length}) {`);
				for (const key of keys) {
					this.field(key, shape[key], varName, fm, "identity");
				}
				this.emit(`} else {`);
				const out = this.tmp("$out");
				this.emit(`var ${out} = {};`);
				for (const key of keys) {
					this.field(key, shape[key], varName, fm, "build", out);
				}
				this.emit(`${varName} = ${out};`);
				this.emit(`}`);
			} else if (mode === "strip") {
				const out = this.tmp("$out");
				this.emit(`var ${out} = {};`);
				for (const key of keys) {
					this.field(key, shape[key], varName, fm, "build", out);
				}
				this.emit(`${varName} = ${out};`);
			} else {
				for (const key of keys) {
					this.field(key, shape[key], varName, fm, "identity");
				}
			}
		} else {
			const out = this.tmp("$out");
			this.emit(`var ${out} = {};`);
			for (const key of keys) {
				this.field(key, shape[key], varName, fm, "build", out);
			}
			if (mode === "passthrough") {
				const shapeExpr = this.add(shape);
				const pk = this.tmp("$pk");
				const pi = this.tmp("$pi");
				const pKey = this.tmp("$pkey");
				this.emit(`var ${pk} = Object.keys(${varName});`);
				this.emit(`for (var ${pi} = 0; ${pi} < ${pk}.length; ${pi}++) {`);
				this.emit(`  var ${pKey} = ${pk}[${pi}];`);
				this.emit(
					`  if (!Object.hasOwn(${shapeExpr}, ${pKey})) ${out}[${pKey}] = ${varName}[${pKey}];`,
				);
				this.emit(`}`);
			}
			this.emit(`${varName} = ${out};`);
		}
	}

	field(
		key: string,
		child: SchemaNode,
		varName: string,
		fm: FM,
		outMode: "identity" | "build",
		outVar?: string,
	): void {
		const keyExpr = q(key);
		const c = this.tmp("$c");
		this.emit(`var ${c} = ${varName}[${keyExpr}];`);
		if (inlineLeaf(child) !== null) {
			this.leaf(child, c, fm, keyExpr);
		} else {
			this.emit(`ctx.path.push(${keyExpr});`);
			this.node(child, c, fm);
			this.emit(`ctx.path.pop();`);
		}
		if (outMode === "build" && outVar !== undefined) {
			this.emit(`${outVar}[${keyExpr}] = ${c};`);
		}
	}

	array(node: SchemaNode, varName: string, fm: FM): void {
		const def = node.def as ArrayDef;
		this.emit(`if (!Array.isArray(${varName})) {`);
		this.failStmt(fm, q("Expected array"), q("array"), varName);
		this.emit(`}`);
		for (const check of def.checks) {
			const op =
				check.type === "min" ? "<" : check.type === "max" ? ">" : "!==";
			this.emit(`if (${varName}.length ${op} ${check.n}) {`);
			this.failStmt(fm, q(check.message));
			this.emit(`}`);
		}
		const i = this.tmp("$i");
		const len = this.tmp("$len");
		this.emit(`var ${len} = ${varName}.length;`);
		if (inlineLeaf(def.item) !== null) {
			this.emit(`for (var ${i} = 0; ${i} < ${len}; ${i}++) {`);
			const c = this.tmp("$c");
			this.emit(`var ${c} = ${varName}[${i}];`);
			this.leaf(def.item, c, fm, i);
			this.emit(`}`);
		} else {
			const transforms = detectTransforms(def.item);
			const out = transforms ? this.tmp("$out") : null;
			if (out !== null) this.emit(`var ${out} = [];`);
			this.emit(`for (var ${i} = 0; ${i} < ${len}; ${i}++) {`);
			const c = this.tmp("$c");
			this.emit(`var ${c} = ${varName}[${i}];`);
			this.emit(`ctx.path.push(${i});`);
			this.node(def.item, c, fm);
			this.emit(`ctx.path.pop();`);
			if (out !== null) this.emit(`${out}[${i}] = ${c};`);
			this.emit(`}`);
			if (out !== null) this.emit(`${varName} = ${out};`);
		}
	}

	tuple(node: SchemaNode, varName: string, fm: FM): void {
		const def = node.def as TupleDef;
		const items = def.items;
		const n = items.length;
		this.emit(`if (!Array.isArray(${varName})) {`);
		this.failStmt(fm, q("Expected tuple"), q("array"), varName);
		this.emit(`}`);
		this.emit(`if (${varName}.length !== ${n}) {`);
		this.failStmt(
			fm,
			`"Expected ${n} item(s), got " + ${varName}.length`,
			q(`${n} item(s)`),
			`${varName}.length + " item(s)"`,
		);
		this.emit(`}`);
		const transforms = items.some((item) => detectTransforms(item));
		if (!transforms) {
			for (let i = 0; i < n; i++) {
				if (inlineLeaf(items[i]) !== null) {
					this.leaf(items[i], `${varName}[${i}]`, fm, String(i));
				} else {
					const c = this.tmp("$c");
					this.emit(`var ${c} = ${varName}[${i}];`);
					this.emit(`ctx.path.push(${i});`);
					this.node(items[i], c, fm);
					this.emit(`ctx.path.pop();`);
				}
			}
		} else {
			const out = this.tmp("$out");
			this.emit(`var ${out} = new Array(${n});`);
			for (let i = 0; i < n; i++) {
				const c = this.tmp("$c");
				this.emit(`var ${c} = ${varName}[${i}];`);
				if (inlineLeaf(items[i]) !== null) {
					this.leaf(items[i], c, fm, String(i));
					this.emit(`${out}[${i}] = ${c};`);
				} else {
					this.emit(`ctx.path.push(${i});`);
					this.node(items[i], c, fm);
					this.emit(`ctx.path.pop();`);
					this.emit(`${out}[${i}] = ${c};`);
				}
			}
			this.emit(`${varName} = ${out};`);
		}
	}

	union(node: SchemaNode, varName: string, fm: FM): void {
		const def = node.def as UnionDef;
		const label = this.tmp("$union");
		this.emit(`${label}: {`);
		for (let i = 0; i < def.options.length; i++) {
			const option = def.options[i];
			const entry = this.tmp("$entry");
			this.emit(`var ${entry} = ctx.issues.length;`);
			if (inlineLeaf(option) !== null) {
				const expr = this.add(inlineLeaf(option));
				this.emit(`if (${expr}(${varName}) === true) break ${label};`);
			} else {
				const ok = this.tmp("$ok");
				const optLabel = this.tmp("$opt");
				this.emit(`${optLabel}: {`);
				this.emit(`var ${ok} = true;`);
				this.node(option, varName, { kind: "soft", ok, label: optLabel });
				this.emit(`if (${ok}) break ${label};`);
				this.emit(`}`);
			}
			this.emit(`ctx.issues.length = ${entry};`);
		}
		this.failStmt(fm, q("Invalid value"), q("union member"), varName);
		this.emit(`}`);
	}

	discriminatedUnion(node: SchemaNode, varName: string, fm: FM): void {
		const def = node.def as DiscriminatedUnionDef;
		this.emit(
			`if (typeof ${varName} !== "object" || ${varName} === null || Array.isArray(${varName})) {`,
		);
		this.failStmt(fm, q("Expected object"), q("object"), varName);
		this.emit(`}`);
		const tag = this.tmp("$tag");
		const matched = this.tmp("$matched");
		this.emit(`var ${tag} = ${varName}[${q(def.key)}];`);
		this.emit(`var ${matched} = false;`);
		for (const [tagValue, schema] of Object.entries(def.options)) {
			this.emit(`if (String(${tag}) === ${q(tagValue)}) {`);
			this.node(schema, varName, fm);
			this.emit(`  ${matched} = true;`);
			this.emit(`}`);
		}
		this.emit(`if (!${matched}) {`);
		this.failStmt(
			fm,
			q(`Invalid discriminator value for "${def.key}"`),
			q("known discriminator"),
			tag,
		);
		this.emit(`}`);
	}

	record(node: SchemaNode, varName: string, fm: FM): void {
		const def = node.def as RecordDef;
		this.emit(
			`if (typeof ${varName} !== "object" || ${varName} === null || Array.isArray(${varName})) {`,
		);
		this.failStmt(fm, q("Expected record"), q("object"), varName);
		this.emit(`}`);
		const k = this.tmp("$k");
		if (inlineLeaf(def.value) !== null) {
			this.emit(`for (var ${k} in ${varName}) {`);
			this.emit(`  if (Object.hasOwn(${varName}, ${k})) {`);
			const c = this.tmp("$c");
			this.emit(`  var ${c} = ${varName}[${k}];`);
			this.leaf(def.value, c, fm, k);
			this.emit(`  }`);
			this.emit(`}`);
		} else {
			const transforms = detectTransforms(def.value);
			const out = transforms ? this.tmp("$out") : null;
			if (out !== null) this.emit(`var ${out} = {};`);
			this.emit(`for (var ${k} in ${varName}) {`);
			this.emit(`  if (Object.hasOwn(${varName}, ${k})) {`);
			const c = this.tmp("$c");
			this.emit(`  var ${c} = ${varName}[${k}];`);
			this.emit(`  ctx.path.push(${k});`);
			this.node(def.value, c, fm);
			this.emit(`  ctx.path.pop();`);
			if (out !== null) this.emit(`  ${out}[${k}] = ${c};`);
			this.emit(`  }`);
			this.emit(`}`);
			if (out !== null) this.emit(`${varName} = ${out};`);
		}
	}

	node(node: SchemaNode, varName: string, fm: FM): void {
		if (inlineLeaf(node) !== null) {
			this.leaf(node, varName, fm, null);
			return;
		}
		switch (node.kind) {
			case "optional":
				this.optional(node, varName, fm);
				break;
			case "nullable":
				this.nullable(node, varName, fm);
				break;
			case "default":
				this.default(node, varName, fm);
				break;
			case "transform":
				this.transform(node, varName, fm);
				break;
			case "refine":
				this.refine(node, varName, fm);
				break;
			case "object":
				this.object(node, varName, fm);
				break;
			case "array":
				this.array(node, varName, fm);
				break;
			case "tuple":
				this.tuple(node, varName, fm);
				break;
			case "union":
				this.union(node, varName, fm);
				break;
			case "discriminatedUnion":
				this.discriminatedUnion(node, varName, fm);
				break;
			case "record":
				this.record(node, varName, fm);
				break;
			default:
				throw new Error(`No codegen for schema kind "${node.kind}"`);
		}
	}
}

export function codegenRun(node: SchemaNode): RunFn {
	const gen = new Gen();
	gen.node(node, "value", { kind: "hard" });
	gen.emit(`return value;`);
	const externals = gen.externals;
	const allExternals = [fail, FAIL, ...externals];
	const names = ["$fail", "$FAIL", ...externals.map((_, i) => `$e${i}`)];
	const decl = names.map((name, i) => `var ${name} = $ext[${i}];`).join("\n");
	const fn = new Function(
		"value",
		"ctx",
		"$ext",
		`${decl}\n${gen.src.join("\n")}`,
	);
	return (value, ctx) => fn(value, ctx, allExternals) as unknown;
}
