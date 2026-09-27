import type { SessionUser } from '$lib/server/auth/session';

declare global {
	namespace App {
		interface Locals {
			user: SessionUser | null;
			sessionToken: string | null;
		}
	}
}

export {};
