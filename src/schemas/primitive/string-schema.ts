import { createSchema, withMethods } from "../../core/schema";
import type { Schema } from "../../core/types";
import type { StringDef } from "./types";

export interface StringSchema extends Schema<string, string> {
	minLength(n: number, message?: string): StringSchema;
	maxLength(n: number, message?: string): StringSchema;
	length(n: number, message?: string): StringSchema;
	pattern(re: RegExp, message?: string): StringSchema;
	email(message?: string): StringSchema;
	url(message?: string): StringSchema;
	startsWith(s: string, message?: string): StringSchema;
	endsWith(s: string, message?: string): StringSchema;
	includes(s: string, message?: string): StringSchema;
}

export function stringSchema(def: StringDef = { checks: [] }): StringSchema {
	const base = createSchema<string, string>("string", def);
	const methods = {
		minLength: (n: number, message?: string): StringSchema =>
			stringSchema({
				checks: [
					...def.checks,
					{
						type: "minLength",
						n,
						message:
							message ?? `String must contain at least ${n} character(s)`,
					},
				],
			}),
		maxLength: (n: number, message?: string): StringSchema =>
			stringSchema({
				checks: [
					...def.checks,
					{
						type: "maxLength",
						n,
						message: message ?? `String must contain at most ${n} character(s)`,
					},
				],
			}),
		length: (n: number, message?: string): StringSchema =>
			stringSchema({
				checks: [
					...def.checks,
					{
						type: "length",
						n,
						message: message ?? `String must contain exactly ${n} character(s)`,
					},
				],
			}),
		pattern: (re: RegExp, message?: string): StringSchema =>
			stringSchema({
				checks: [
					...def.checks,
					{
						type: "pattern",
						re,
						message: message ?? `String must match the pattern ${re}`,
					},
				],
			}),
		email: (message?: string): StringSchema =>
			stringSchema({
				checks: [
					...def.checks,
					{ type: "email", message: message ?? "Invalid email address" },
				],
			}),
		url: (message?: string): StringSchema =>
			stringSchema({
				checks: [
					...def.checks,
					{ type: "url", message: message ?? "Invalid URL" },
				],
			}),
		startsWith: (s: string, message?: string): StringSchema =>
			stringSchema({
				checks: [
					...def.checks,
					{
						type: "startsWith",
						s,
						message: message ?? `String must start with "${s}"`,
					},
				],
			}),
		endsWith: (s: string, message?: string): StringSchema =>
			stringSchema({
				checks: [
					...def.checks,
					{
						type: "endsWith",
						s,
						message: message ?? `String must end with "${s}"`,
					},
				],
			}),
		includes: (s: string, message?: string): StringSchema =>
			stringSchema({
				checks: [
					...def.checks,
					{
						type: "includes",
						s,
						message: message ?? `String must include "${s}"`,
					},
				],
			}),
	};
	return withMethods(base, methods) as StringSchema;
}
