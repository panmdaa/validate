import * as v from "valibot";
import { bench, describe } from "vitest";
import {
	ajvDeep,
	ajvObject,
	arktypeDeep,
	arktypeObject,
	deepData,
	objectData,
	panDeep,
	panObject,
	valibotDeep,
	valibotObject,
	yupDeep,
	yupObject,
	zodDeep,
	zodObject,
} from "./helpers";

describe("object (2 keys)", () => {
	bench("@panmdaa/validate", () => {
		panObject(objectData);
	});

	bench("zod", () => {
		zodObject.parse(objectData);
	});

	bench("valibot", () => {
		v.parse(valibotObject, objectData);
	});

	bench("arktype", () => {
		arktypeObject(objectData);
	});

	bench("yup", () => {
		yupObject.validateSync(objectData);
	});

	bench("ajv", () => {
		ajvObject(objectData);
	});
});

describe("nested object (5 keys + address)", () => {
	bench("@panmdaa/validate", () => {
		panDeep(deepData);
	});

	bench("zod", () => {
		zodDeep.parse(deepData);
	});

	bench("valibot", () => {
		v.parse(valibotDeep, deepData);
	});

	bench("arktype", () => {
		arktypeDeep(deepData);
	});

	bench("yup", () => {
		yupDeep.validateSync(deepData);
	});

	bench("ajv", () => {
		ajvDeep(deepData);
	});
});
