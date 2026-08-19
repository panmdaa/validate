import { Validator, type Infer } from "@panmdaa/validate";

const passwordSchema = Validator.string()
	.minLength(8, "at least 8 characters")
	.pattern(/[A-Z]/, "must contain an uppercase letter")
	.pattern(/[0-9]/, "must contain a digit");

export const registrationSchema = Validator.object({
	username: Validator.string()
		.minLength(3, "at least 3 characters")
		.maxLength(30, "at most 30 characters")
		.pattern(/^[a-z0-9_]+$/, "only lowercase letters, digits and underscores"),
	email: Validator.string().email(),
	password: passwordSchema,
	confirmPassword: Validator.string(),
	acceptTerms: Validator.boolean().refine(
		(value) => value === true,
		"you must accept the terms",
	),
}).refine(
	(value) => value.password === value.confirmPassword,
	"passwords do not match",
);

export type Registration = Infer<typeof registrationSchema>;

export type FormState = { errors: Record<string, string> } | Registration;

export function submitRegistration(values: unknown): FormState {
	const result = registrationSchema.safeParseAll(values);
	if (result.success) {
		return result.value;
	}

	const errors: Record<string, string> = {};
	for (const issue of result.issues) {
		const field = issue.path.join(".");
		errors[field] ??= issue.message;
	}
	return { errors };
}
