export interface Issue {
	path: (string | number)[];
	message: string;
	expected?: string;
	received?: string;
}

export type Result<O> =
	| { success: true; value: O }
	| { success: false; issues: Issue[] };

export interface RunCtx {
	path: (string | number)[];
	issues: Issue[];
	collect: boolean;
	failFast?: boolean;
}

export type RunFn = (value: unknown, ctx: RunCtx) => unknown;

export interface SchemaNode {
	readonly kind: string;
	readonly def: unknown;
}

export interface Schema<In = unknown, Out = unknown> {
	(value: unknown): Out;
	readonly kind: string;
	readonly def: unknown;
	is(value: unknown): value is Out;
	safeParse(value: unknown): Result<Out>;
	safeParseAll(value: unknown): Result<Out>;
	validate(value: unknown): Out;
	optional(): Schema<In | undefined, Out | undefined>;
	nullable(): Schema<In | null, Out | null>;
	default<D>(value: D): Schema<In | undefined, D | Exclude<Out, undefined>>;
	transform<O>(fn: (value: Out) => O): Schema<In, O>;
	refine(
		fn: (value: Out) => boolean | string,
		message?: string,
	): Schema<In, Out>;
}

export type Infer<S> = S extends Schema<unknown, infer O> ? O : never;
export type Input<S> = S extends Schema<infer I, unknown> ? I : never;
export type Output<S> = Infer<S>;
