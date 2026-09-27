<script lang="ts">
	let { status }: { status: string } = $props();
	const label: Record<string, string> = { 'in-cv': 'IN CV', available: 'LEFT OUT', gap: 'GAP', covered: 'COVERED', ignored: 'N/A' };
</script>

<span class="st {status}">{label[status] ?? status}</span>

<style>
	.st { padding: 0 0.6ch; font-weight: bold; color: #000; white-space: nowrap; }
	.in-cv, .covered { background: var(--ok); }
	.available { background: #ffff55; }
	.gap { background: var(--error); }
	.ignored { background: var(--dim); }
</style>
