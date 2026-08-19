import { Validator, type Infer } from "@panmdaa/validate";

const portSchema = Validator.number().int().min(1).max(65535).default(3000);
const nodeEnvSchema = Validator.enum(["development", "test", "production"]).default("development");
const debugSchema = Validator.enum(["true", "false"])
	.default("false")
	.transform((value) => value === "true");

const configSchema = Validator.object({
	HOST: Validator.string().minLength(1).default("0.0.0.0"),
	PORT: portSchema,
	NODE_ENV: nodeEnvSchema,
	DEBUG: debugSchema,
	DB_URL: Validator.string().url(),
	WORKERS: Validator.number().int().min(1).default(1),
});

export type Config = Infer<typeof configSchema>;

export function loadConfig(source: Record<string, string | undefined>): Config {
	const result = configSchema.safeParseAll({
		HOST: source.HOST ?? undefined,
		PORT: source.PORT ?? undefined,
		NODE_ENV: source.NODE_ENV ?? undefined,
		DEBUG: source.DEBUG ?? undefined,
		DB_URL: source.DB_URL ?? undefined,
		WORKERS: source.WORKERS ?? undefined,
	});

	if (!result.success) {
		const details = result.issues
			.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
			.join("; ");
		throw new Error(`invalid environment: ${details}`);
	}

	return result.value;
}
