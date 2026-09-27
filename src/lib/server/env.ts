// Runtime configuration. Read once; fail fast on bad values outside development.
export const APP_ENVS = ['development', 'staging', 'production'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

function read() {
	const raw = process.env.APP_ENV ?? 'development';
	if (!(APP_ENVS as readonly string[]).includes(raw)) {
		throw new Error(`APP_ENV must be one of ${APP_ENVS.join(', ')} (got "${raw}")`);
	}
	const appEnv = raw as AppEnv;
	const origin = process.env.ORIGIN ?? 'http://localhost:5173';
	if (appEnv !== 'development' && !origin.startsWith('https://')) {
		throw new Error(`ORIGIN must be https:// when APP_ENV=${appEnv}`);
	}
	return {
		appEnv,
		origin,
		/** Cookies get the Secure flag everywhere except local development. */
		secureCookies: appEnv !== 'development',
		adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase() || null,
		// Shown on the privacy notice. Required reading for testers; set them before inviting anyone.
		operator: {
			name: process.env.OPERATOR_NAME?.trim() || null,
			contact: process.env.OPERATOR_CONTACT?.trim() || null,
			hosting: process.env.HOSTING_DESCRIPTION?.trim() || null,
			backupRetentionDays: Number(process.env.BACKUP_RETENTION_DAYS) || 30
		}
	};
}

export const env = read();
