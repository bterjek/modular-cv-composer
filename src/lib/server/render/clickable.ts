import { createHash } from 'node:crypto';
import { CLICK_SCRIPT } from '$lib/render/clickable';

/** CSP hash that allows exactly the click script and nothing else. */
export const CLICK_SCRIPT_HASH = createHash('sha256').update(CLICK_SCRIPT).digest('base64');
