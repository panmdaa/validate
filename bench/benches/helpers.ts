import Ajv from "ajv";
import { type } from "arktype";
import * as v from "valibot";
import * as yup from "yup";
import { z } from "zod";
import { Validator } from "../../src/index";

const ajv = new Ajv();

// ---------- sample data ----------

export const stringData = "hello world";
export const numberData = 42;
export const objectData = { name: "Ada Lovelace", age: 36 };
export const badObjectData = { name: 123, age: "x" };
export const arrayData = [1, 2, 3, 4, 5];
export const unionData = "hello world";
export const recordData = { a: 1, b: 2, c: 3 };
export const deepData = {
	name: "Ada Lovelace",
	age: 36,
	email: "ada@example.com",
	tags: ["math", "analytical"],
	address: { street: "Main St", city: "London", zip: 12345 },
};

// ---------- string ----------

export const panString = Validator.string().minLength(3);
export const zodString = z.string().min(3);
export const valibotString = v.pipe(v.string(), v.minLength(3));
export const arktypeString = type("string");
export const yupString = yup.string().min(3);
export const ajvString = ajv.compile({ type: "string", minLength: 3 });

// ---------- number ----------

export const panNumber = Validator.number().min(0).max(120);
export const zodNumber = z.number().min(0).max(120);
export const valibotNumber = v.pipe(v.number(), v.minValue(0), v.maxValue(120));
export const arktypeNumber = type("number");
export const yupNumber = yup.number().min(0).max(120);
export const ajvNumber = ajv.compile({
	type: "number",
	minimum: 0,
	maximum: 120,
});

// ---------- object ----------

export const panObject = Validator.object({
	name: Validator.string().minLength(3),
	age: Validator.number().min(0).max(120),
});
export const zodObject = z.object({
	name: z.string().min(3),
	age: z.number().min(0).max(120),
});
export const valibotObject = v.object({
	name: v.pipe(v.string(), v.minLength(3)),
	age: v.pipe(v.number(), v.minValue(0), v.maxValue(120)),
});
export const arktypeObject = type({
	name: "string",
	age: "number",
});
export const yupObject = yup.object({
	name: yup.string().min(3),
	age: yup.number().min(0).max(120),
});
export const ajvObject = ajv.compile({
	type: "object",
	properties: {
		name: { type: "string", minLength: 3 },
		age: { type: "number", minimum: 0, maximum: 120 },
	},
	required: ["name", "age"],
	additionalProperties: false,
});

// ---------- deep object ----------

export const panDeep = Validator.object({
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
export const zodDeep = z.object({
	name: z.string().min(3),
	age: z.number().min(0).max(120),
	email: z.string(),
	tags: z.array(z.string()),
	address: z.object({ street: z.string(), city: z.string(), zip: z.number() }),
});
export const valibotDeep = v.object({
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
export const arktypeDeep = type({
	name: "string",
	age: "number",
	email: "string",
	tags: "string[]",
	address: { street: "string", city: "string", zip: "number" },
});
export const yupDeep = yup.object({
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
export const ajvDeep = ajv.compile({
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

// ---------- array ----------

export const panArray = Validator.array(Validator.number()).min(2);
export const zodArray = z.array(z.number()).min(2);
export const valibotArray = v.pipe(v.array(v.number()), v.minLength(2));
export const arktypeArray = type("number[]");
export const yupArray = yup.array().of(yup.number()).min(2);
export const ajvArray = ajv.compile({
	type: "array",
	items: { type: "number" },
	minItems: 2,
});

// ---------- union ----------

export const panUnion = Validator.union([
	Validator.string(),
	Validator.number(),
	Validator.boolean(),
]);
export const zodUnion = z.union([z.string(), z.number(), z.boolean()]);
export const valibotUnion = v.union([v.string(), v.number(), v.boolean()]);
export const arktypeUnion = type("string | number | boolean");
export const ajvUnion = ajv.compile({
	anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
});

// ---------- record ----------

export const panRecord = Validator.record(Validator.number());
export const zodRecord = z.record(z.string(), z.number());
export const valibotRecord = v.record(v.string(), v.number());
export const arktypeRecord = type("Record<string, number>");
export const ajvRecord = ajv.compile({
	type: "object",
	additionalProperties: { type: "number" },
});
