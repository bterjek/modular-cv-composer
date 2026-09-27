// Built-in database backups: a consistent SQLite copy into BACKUP_DIR (default /data/backups)
// every BACKUP_INTERVAL_HOURS, deleting copies older than BACKUP_RETENTION_DAYS — the same
// number the privacy notice states. They sit on the same volume, so the host must still copy
// them off the machine (see docs/DEPLOY.md).
import { mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { sqlite } from './db';

const PREFIX = 'composer-';
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');

export function backupDir() {
	return process.env.BACKUP_DIR ?? join(dirname(process.env.DATABASE_PATH ?? './data/dev.sqlite'), 'backups');
}

export async function runBackup(opts: { dir?: string; retentionDays?: number; now?: Date } = {}) {
	const dir = opts.dir ?? backupDir();
	const now = opts.now ?? new Date();
	const retentionDays = opts.retentionDays ?? (Number(process.env.BACKUP_RETENTION_DAYS) || 30);
	mkdirSync(dir, { recursive: true });
	const file = join(dir, `${PREFIX}${stamp(now)}.sqlite`);
	await sqlite.backup(file);
	const cutoff = now.getTime() - retentionDays * 86_400_000;
	const removed: string[] = [];
	for (const f of readdirSync(dir)) {
		if (!f.startsWith(PREFIX) || !f.endsWith('.sqlite')) continue;
		const p = join(dir, f);
		if (statSync(p).mtimeMs < cutoff) {
			unlinkSync(p);
			removed.push(f);
		}
	}
	return { file, removed };
}

let timer: ReturnType<typeof setInterval> | null = null;

/** Starts periodic backups unless BACKUP_INTERVAL_HOURS=0. First run shortly after start-up. */
export function scheduleBackups(log = console.log) {
	const hours = process.env.BACKUP_INTERVAL_HOURS === undefined ? 24 : Number(process.env.BACKUP_INTERVAL_HOURS);
	if (!hours || hours <= 0 || process.env.DATABASE_PATH === ':memory:') return;
	const go = () =>
		runBackup()
			.then((r) => log(`[backup] wrote ${r.file}${r.removed.length ? `, removed ${r.removed.length} old` : ''}`))
			.catch((e) => console.error('[backup] failed:', e));
	setTimeout(go, 60_000).unref();
	timer = setInterval(go, hours * 3_600_000);
	timer.unref();
}

export function stopBackups() {
	if (timer) clearInterval(timer);
	timer = null;
}
