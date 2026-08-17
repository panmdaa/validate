import * as v from "valibot";
import { bench, describe } from "vitest";
import {
	ajvRecord,
	arktypeRecord,
	panRecord,
	recordData,
	valibotRecord,
	zodRecord,
} from "./helpers";

describe("record (string keys, number values)", () => {
	bench("@panmdaa/validate", () => {
		panRecord(recordData);
	});

	bench("zod", () => {
		zodRecord.parse(recordData);
	});

	bench("valibot", () => {
		v.parse(valibotRecord, recordData);
	});

	bench("arktype", () => {
		arktypeRecord(recordData);
	});

	bench("ajv", () => {
		ajvRecord(recordData);
	});
});
