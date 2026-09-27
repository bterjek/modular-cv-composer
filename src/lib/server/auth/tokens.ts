// Random tokens and human-typeable codes. Only hashes are ever stored.
import { createHash, randomBytes } from 'node:crypto';

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** 256-bit token for cookies. */
export const newToken = () => randomBytes(32).toString('base64url');

// Crockford base32: no I, L, O, U — nothing that can be misread when typed.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Code like 7K3M-QX9P-2RTV-H4WD (80 bits). */
export function newCode(groups = 4): string {
	const bytes = randomBytes(groups * 4);
	let out = '';
	for (let i = 0; i < bytes.length; i++) {
		if (i > 0 && i % 4 === 0) out += '-';
		out += ALPHABET[bytes[i] & 31];
	}
	return out;
}

/** Accepts lower case, spaces, missing dashes and the usual look-alikes. */
export function normalizeCode(input: string): string {
	const s = input
		.toUpperCase()
		.replace(/[^0-9A-Z]/g, '')
		.replace(/[IL]/g, '1')
		.replace(/O/g, '0');
	return s.replace(/(.{4})(?=.)/g, '$1-');
}

export const hashCode = (input: string) => sha256(normalizeCode(input));
