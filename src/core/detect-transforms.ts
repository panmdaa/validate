import type { SchemaNode } from "./types";

export function detectTransforms(schema: SchemaNode): boolean {
	switch (schema.kind) {
		case "transform":
		case "default":
			return true;
		case "object": {
			const shape = (schema.def as { shape: Record<string, SchemaNode> }).shape;
			for (const key in shape) {
				if (detectTransforms(shape[key])) return true;
			}
			return false;
		}
		case "array":
			return detectTransforms((schema.def as { item: SchemaNode }).item);
		case "tuple":
			return (schema.def as { items: SchemaNode[] }).items.some(
				detectTransforms,
			);
		case "union":
			return (schema.def as { options: SchemaNode[] }).options.some(
				detectTransforms,
			);
		case "discriminatedUnion":
			return Object.values(
				(schema.def as { options: Record<string, SchemaNode> }).options,
			).some(detectTransforms);
		case "record":
			return detectTransforms((schema.def as { value: SchemaNode }).value);
		case "optional":
		case "nullable":
		case "refine":
			return detectTransforms((schema.def as { inner: SchemaNode }).inner);
		default:
			return false;
	}
}
