import { Validator } from "@panmdaa/validate";

export const person = Validator.object({
	name: Validator.string().minLength(1),
	age: Validator.number().int().min(0).max(150),
});

const input: unknown = { name: "Ada", age: 37 };

// validate: throw on invalid input
const ada = person(input);
console.log(ada.name, ada.age);

// safeParse: no exceptions, inspect the issues
const result = person.safeParse({ name: "", age: 37 });
if (!result.success) {
	console.log(result.issues[0].message); // "String must have at least 1 character(s)"
}

// safeParseAll: collect every issue instead of stopping at the first
const all = person.safeParseAll({ name: "", age: 999 });
if (!all.success) {
	console.log(all.issues.length); // 2
}

// is: cheap boolean check, only for "yes or no" questions
console.log(person.is({ name: "Ada", age: 37 })); // true
console.log(person.is("not an object")); // false
