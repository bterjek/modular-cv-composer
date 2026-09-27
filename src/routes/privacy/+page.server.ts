import { env } from '$lib/server/env';
export const load = () => ({ operator: env.operator, appEnv: env.appEnv });
