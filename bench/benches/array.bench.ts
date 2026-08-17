import * as v from "valibot";
import { bench, describe } from "vitest";
import {
	ajvArray,
	arktypeArray,
	arrayData,
	panArray,
	valibotArray,
	yupArray,
	zodArray,
} from "./helpers";

describe("array of numbers (min 2)", () => {
	bench("@panmdaa/validate", () => {
		panArray(arrayData);
	});

	bench("zod", () => {
		zodArray.parse(arrayData);
	});

	bench("valibot", () => {
		v.parse(valibotArray, arrayData);
	});

	bench("arktype", () => {
		arktypeArray(arrayData);
	});

	bench("yup", () => {
		yupArray.validateSync(arrayData);
	});

	bench("ajv", () => {
		ajvArray(arrayData);
	});
});
