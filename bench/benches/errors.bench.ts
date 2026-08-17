import * as v from "valibot";
import { bench, describe } from "vitest";
import {
	ajvObject,
	arktypeObject,
	badObjectData,
	panObject,
	valibotObject,
	yupObject,
	zodObject,
} from "./helpers";

describe("object validation failure (safe path)", () => {
	bench("@panmdaa/validate", () => {
		panObject.safeParse(badObjectData);
	});

	bench("zod", () => {
		zodObject.safeParse(badObjectData);
	});

	bench("valibot", () => {
		v.safeParse(valibotObject, badObjectData);
	});

	bench("arktype", () => {
		arktypeObject.allows(badObjectData);
	});

	bench("yup", () => {
		yupObject.isValidSync(badObjectData);
	});

	bench("ajv", () => {
		ajvObject(badObjectData);
	});
});
