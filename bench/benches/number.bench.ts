import * as v from "valibot";
import { bench, describe } from "vitest";
import {
	ajvNumber,
	arktypeNumber,
	numberData,
	panNumber,
	valibotNumber,
	yupNumber,
	zodNumber,
} from "./helpers";

describe("number (min 0, max 120)", () => {
	bench("@panmdaa/validate", () => {
		panNumber(numberData);
	});

	bench("zod", () => {
		zodNumber.parse(numberData);
	});

	bench("valibot", () => {
		v.parse(valibotNumber, numberData);
	});

	bench("arktype", () => {
		arktypeNumber(numberData);
	});

	bench("yup", () => {
		yupNumber.validateSync(numberData);
	});

	bench("ajv", () => {
		ajvNumber(numberData);
	});
});
