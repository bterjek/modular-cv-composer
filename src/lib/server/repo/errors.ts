/** Thrown for anything the caller does not own. Never distinguishes "missing" from "not yours". */
export class NotFoundError extends Error {
	constructor(what = 'Not found') {
		super(what);
		this.name = 'NotFoundError';
	}
}

/** Thrown for input that fails validation or a business rule. */
export class InvalidError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidError';
	}
}
