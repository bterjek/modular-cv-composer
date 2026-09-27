// Password hashing with scrypt (node:crypto, no native dependency).
// Parameters follow the OWASP Password Storage Cheat Sheet: N=2^17, r=8, p=1.
import { scrypt, randomBytes, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const PARAMS = { N: 2 ** 17, r: 8, p: 1, keylen: 64 };
const MAXMEM = 256 * 1024 * 1024;

function derive(password: string, salt: Buffer, o: typeof PARAMS): Promise<Buffer> {
	const opts: ScryptOptions = { N: o.N, r: o.r, p: o.p, maxmem: MAXMEM };
	return new Promise((resolve, reject) =>
		scrypt(password.normalize('NFKC'), salt, o.keylen, opts, (err, key) =>
			err ? reject(err) : resolve(key)
		)
	);
}

export const MIN_PASSWORD = 12;
export const MAX_PASSWORD = 256;

export function passwordProblem(password: string): string | null {
	if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
	if (password.length > MAX_PASSWORD) return `Use at most ${MAX_PASSWORD} characters.`;
	return null;
}

/** Format: scrypt$N$r$p$salt$hash (base64url), so parameters can change later. */
export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const key = await derive(password, salt, PARAMS);
	const { N, r, p } = PARAMS;
	return ['scrypt', N, r, p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
	const [alg, N, r, p, salt, hash] = stored.split('$');
	if (alg !== 'scrypt' || !hash) return false;
	const expected = Buffer.from(hash, 'base64url');
	const key = await derive(password, Buffer.from(salt, 'base64url'), {
		N: Number(N),
		r: Number(r),
		p: Number(p),
		keylen: expected.length
	});
	return timingSafeEqual(key, expected);
}

// Used when the e-mail is unknown, so a failed login takes the same time either way.
let dummy: Promise<string> | null = null;
export async function burnPasswordCheck(password: string) {
	dummy ??= hashPassword('dummy-password-for-timing');
	await verifyPassword(await dummy, password);
}
