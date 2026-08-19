import { Validator, type Infer } from "@panmdaa/validate";

const role = Validator.enum(["member", "admin"]);

const createUserShape = {
	name: Validator.string().minLength(1).maxLength(80).transform((value) => value.trim()),
	email: Validator.string().email().transform((value) => value.toLowerCase()),
	role: role.default("member"),
	tags: Validator.array(Validator.string().minLength(1)).max(20).default([]),
};

const createUserSchema = Validator.object(createUserShape);
const updateUserSchema = Validator.object({
	name: createUserShape.name.optional(),
	email: createUserShape.email.optional(),
	role: role.optional(),
	tags: createUserShape.tags,
});

type CreateUser = Infer<typeof createUserSchema>;

export async function handleCreateUser(request: Request): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: "invalid JSON body" }, 400);
	}

	const result = createUserSchema.safeParse(body);
	if (!result.success) {
		return json({ error: "validation failed", issues: result.issues }, 422);
	}

	const user = result.value;
	return json({ user, email: user.email, welcome: `Welcome, ${user.name}!` }, 201);
}

export async function handleUpdateUser(request: Request): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: "invalid JSON body" }, 400);
	}

	const result = updateUserSchema.safeParse(body);
	if (!result.success) {
		return json({ error: "validation failed", issues: result.issues }, 422);
	}
	return json({ user: result.value });
}

export function handleListUsers(request: Request): Response {
	const url = new URL(request.url);

	const limit = Validator.number()
		.int()
		.min(1)
		.max(100)
		.safeParse(Number(url.searchParams.get("limit") ?? 20));
	const offset = Validator.number()
		.int()
		.min(0)
		.safeParse(Number(url.searchParams.get("offset") ?? 0));

	if (!limit.success || !offset.success) {
		return json({ error: "invalid query parameters" }, 422);
	}

	return json({ users: [], limit: limit.value, offset: offset.value });
}

export function handleGetUser(request: Request): Response {
	const params = Validator.object({
		id: Validator.string().minLength(1),
	}).safeParse({
		id: new URL(request.url).pathname.split("/").at(-1) ?? "",
	});

	if (!params.success) {
		return json({ error: "invalid id" }, 422);
	}

	const user = createUserSchema.safeParse({
		name: `User ${params.value.id}`,
		email: `user${params.value.id}@example.com`,
	});
	if (!user.success) {
		return json({ error: "validation failed" }, 422);
	}
	return json({ user: user.value });
}

export function notifyAdmins(users: CreateUser[]): string[] {
	return users
		.filter((user) => user.role === "admin")
		.map((user) => `${user.name} <${user.email}>`);
}

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}
