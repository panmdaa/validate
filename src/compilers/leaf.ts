import { fail } from "../core/run";
import type { RunFn } from "../core/types";
import type { LeafCheck } from "./types";

export function leafRun(check: LeafCheck): RunFn {
	return (value, ctx) => {
		const result = check(value);
		if (result === true) return value;
		return fail(ctx, result.message, result.expected, result.received);
	};
}
