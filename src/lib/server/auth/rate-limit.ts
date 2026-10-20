// In-memory fixed-window limiter. Fine for a single container; move to the
// database if the app ever runs as more than one instance.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function hit(key: string, limit: number, windowMs: number, now = Date.now()) {
	let b = buckets.get(key);
	if (!b || b.resetAt <= now) {
		b = { count: 0, resetAt: now + windowMs };
		buckets.set(key, b);
	}
	b.count++;
	if (buckets.size > 10_000) {
		for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
	}
	return { allowed: b.count <= limit, retryAfterMs: Math.max(0, b.resetAt - now) };
}
