import * as v from "valibot";
import { bench, describe } from "vitest";
import {
	ajvUnion,
	arktypeUnion,
	panUnion,
	unionData,
	valibotUnion,
	zodUnion,
} from "./helpers";

describe("union (string | number | boolean)", () => {
	bench("@panmdaa/validate", () => {
		panUnion(unionData);
	});

	bench("zod", () => {
		zodUnion.parse(unionData);
	});

	bench("valibot", () => {
		v.parse(valibotUnion, unionData);
	});

	bench("arktype", () => {
		arktypeUnion(unionData);
	});

	bench("ajv", () => {
		ajvUnion(unionData);
	});
});
