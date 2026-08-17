import Ajv from "ajv";
import { type } from "arktype";
import * as v from "valibot";
import * as yup from "yup";
import { z } from "zod";
import { Validator } from "../../src/index";

const N = 1_000_000;

const data = {
	name: "Ada Lovelace",
	age: 36,
	email: "ada@example.com",
	tags: ["math", "analytical"],
	address: { street: "Main St", city: "London", zip: 12345 },
};

const pan = Validator.object({
	name: Validator.string().minLength(3),
	age: Validator.number().min(0).max(120),
	email: Validator.string(),
	tags: Validator.array(Validator.string()),
	address: Validator.object({
		street: Validator.string(),
		city: Validator.string(),
		zip: Validator.number(),
	}),
});
const zodS = z.object({
	name: z.string().min(3),
	age: z.number().min(0).max(120),
	email: z.string(),
	tags: z.array(z.string()),
	address: z.object({ street: z.string(), city: z.string(), zip: z.number() }),
});
const val = v.object({
	name: v.pipe(v.string(), v.minLength(3)),
	age: v.pipe(v.number(), v.minValue(0), v.maxValue(120)),
	email: v.string(),
	tags: v.array(v.string()),
	address: v.object({
		street: v.string(),
		city: v.string(),
		zip: v.number(),
	}),
});
const ark = type({
	name: "string",
	age: "number",
	email: "string",
	tags: "string[]",
	address: { street: "string", city: "string", zip: "number" },
});
const yupS = yup.object({
	name: yup.string().min(3),
	age: yup.number().min(0).max(120),
	email: yup.string(),
	tags: yup.array().of(yup.string()),
	address: yup.object({
		street: yup.string(),
		city: yup.string(),
		zip: yup.number(),
	}),
});
const ajvS = new Ajv().compile({
	type: "object",
	properties: {
		name: { type: "string", minLength: 3 },
		age: { type: "number", minimum: 0, maximum: 120 },
		email: { type: "string" },
		tags: { type: "array", items: { type: "string" } },
		address: {
			type: "object",
			properties: {
				street: { type: "string" },
				city: { type: "string" },
				zip: { type: "number" },
			},
			required: ["street", "city", "zip"],
			additionalProperties: false,
		},
	},
	required: ["name", "age", "email", "tags", "address"],
	additionalProperties: false,
});

const suites: { name: string; fn: () => unknown }[] = [
	{ name: "@panmdaa/validate", fn: () => pan(data) },
	{ name: "zod", fn: () => zodS.parse(data) },
	{ name: "valibot", fn: () => v.parse(val, data) },
	{ name: "arktype", fn: () => ark(data) },
	{ name: "yup", fn: () => yupS.validateSync(data) },
	{ name: "ajv", fn: () => ajvS(data) },
];

function measure(fn: () => unknown): { retained: number; opsPerSec: number } {
	for (let i = 0; i < 10_000; i++) fn();
	globalThis.gc?.();
	const before = process.memoryUsage().heapUsed;
	const start = process.hrtime.bigint();
	for (let i = 0; i < N; i++) fn();
	const elapsed = process.hrtime.bigint() - start;
	globalThis.gc?.();
	const after = process.memoryUsage().heapUsed;
	const retained = Math.max(0, after - before);
	const opsPerSec = Number((BigInt(N) * 1_000_000_000n) / elapsed);
	return { retained, opsPerSec };
}

console.log(`Deep-object validation, ${N.toLocaleString()} iterations each`);
console.table(
	suites.map((suite) => {
		const { retained, opsPerSec } = measure(suite.fn);
		return {
			library: suite.name,
			"retained heap (bytes)": retained,
			"ops/sec": opsPerSec,
		};
	}),
);
