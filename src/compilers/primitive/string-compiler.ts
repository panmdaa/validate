import type { StringCheck, StringDef } from "../../schemas/primitive/types";
import { leafRun } from "../leaf";
import type { LeafCheck, LeafIssue, NodeCompiler } from "../types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function check(c: StringCheck): (value: string) => boolean {
	switch (c.type) {
		case "minLength":
			return (v) => v.length >= c.n;
		case "maxLength":
			return (v) => v.length <= c.n;
		case "length":
			return (v) => v.length === c.n;
		case "pattern":
			return (v) => {
				c.re.lastIndex = 0;
				return c.re.test(v);
			};
		case "email":
			return (v) => EMAIL_RE.test(v);
		case "url":
			return (v) => {
				try {
					new URL(v);
					return true;
				} catch {
					return false;
				}
			};
		case "startsWith":
			return (v) => v.startsWith(c.s);
		case "endsWith":
			return (v) => v.endsWith(c.s);
		case "includes":
			return (v) => v.includes(c.s);
	}
}

function notString(value: unknown): LeafIssue {
	return { message: "Expected string", expected: "string", received: value };
}

export function buildStringCheck(def: StringDef): LeafCheck {
	const checks = def.checks.map(check);
	return (value) => {
		if (typeof value !== "string") return notString(value);
		for (let i = 0; i < checks.length; i++) {
			if (!checks[i](value)) {
				return { message: def.checks[i].message };
			}
		}
		return true;
	};
}

export const compileString: NodeCompiler = (node) =>
	leafRun(buildStringCheck(node.def as StringDef));
