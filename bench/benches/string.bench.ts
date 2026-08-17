import * as v from "valibot";
import { bench, describe } from "vitest";
import {
	ajvString,
	arktypeString,
	panString,
	stringData,
	valibotString,
	yupString,
	zodString,
} from "./helpers";

describe("string (min length 3)", () => {
	bench("@panmdaa/validate", () => {
		panString(stringData);
	});

	bench("zod", () => {
		zodString.parse(stringData);
	});

	bench("valibot", () => {
		v.parse(valibotString, stringData);
	});

	bench("arktype", () => {
		arktypeString(stringData);
	});

	bench("yup", () => {
		yupString.validateSync(stringData);
	});

	bench("ajv", () => {
		ajvString(stringData);
	});
});
