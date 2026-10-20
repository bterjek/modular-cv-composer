<script lang="ts">
 import { untrack } from 'svelte';
 import { MODULES } from '$lib/domain/modules';
 import { MODULE_LABELS } from '$lib/editor/fields';
 import ReconcileBlock from '$lib/editor/ReconcileBlock.svelte';
 import EntryFields from '$lib/editor/EntryFields.svelte';
 import type { ImportDraft, ImportBlock } from '$lib/domain/import';
 let { data, form } = $props();
 type ReviewDraft = Omit<ImportDraft, 'blocks'> & { blocks: (ImportBlock & { origin: number; itemText: string })[] };
 const editable = (value: ImportDraft): ReviewDraft => ({ ...structuredClone(value), blocks: value.blocks.map((block, origin) => ({ ...structuredClone(block), origin, itemText: block.items.join('\n'), reconciliation: block.reconciliation ?? null })) });
 let draft = $state<ReviewDraft>(untrack(() => editable(data.review.draft)));
 $effect(() => { draft = editable(form?.draft ?? data.review.draft); });
 function split(index: number) {
  const block = draft.blocks[index];
  const newline = block.text.indexOf('\n');
  if (newline < 0) return;
  const remainder = block.text.slice(newline + 1).trim();
  block.text = block.text.slice(0, newline).trim();
  draft.blocks.splice(index + 1, 0, { ...structuredClone($state.snapshot(block)), text: remainder, items: [], itemText: '', label: (block.label + ' (split)').slice(0, 120) });
 }
 function add() {
  draft.blocks.push({ origin: -1, module: 'custom', label: 'New section', included: true, data: { heading: 'Other' }, text: '', items: [], itemText: '', sourceExcerpt: '', location: 'Added during review', warnings: [] });
 }
</script>
<svelte:head><title>Review {data.review.source.filename} · Import</title></svelte:head>
<section class="window">
 <p><a href="/edit/imports">← All imports</a></p>
 <h1>Review your CV import</h1>
 <p><a href="/edit/imports/{data.review.id}/original" data-sveltekit-reload>Download original: {data.review.source.filename}</a></p>
 {#if form?.error}<p class="msg err" role="alert">{form.error}</p>{/if}
 {#if data.review.acceptedAt}
  <p class="msg ok" role="status">This CV was added to your library. Its selection and wording were also saved as an independent composition.</p>
  <p><a href="/edit/content">Open library content</a>{#if data.review.compositionId} · <a href="/edit/cvs/{data.review.compositionId}">Open this saved CV</a>{/if}</p>
  <p class="hint">Open the saved CV for its Classical A4 preview and export. The composition editor follows in the next phase.</p>
 {:else}
  <p>Check the wording, section types and factual fields. Recognised headers appear in the factual fields; their original lines remain under Source text. Incomplete drafts can be saved. Approval follows your chosen matches and preserves this CV’s selection and order.</p>
  <ul class="warnings">{#each draft.warnings as warning}<li>{warning}</li>{/each}</ul>
  <form method="POST" action="?/save" novalidate data-primary>
   <label for="name">CV name</label><input id="name" name="name" bind:value={draft.name} maxlength="200" />
   <details><summary>Profile details (optional)</summary>
   <fieldset><legend>Profile found in the document</legend>
    <label for="fullName">Full name</label><input id="fullName" name="fullName" bind:value={draft.profile.fullName} />
    <label for="email">Email</label><input id="email" name="email" type="email" bind:value={draft.profile.email} />
    <label for="phone">Phone</label><input id="phone" name="phone" bind:value={draft.profile.phone} />
    <label for="location">Location</label><input id="location" name="location" bind:value={draft.profile.location} />
    {#if !data.hasProfile}<label><input type="checkbox" name="applyProfile" bind:checked={draft.applyProfile} /> Also save as my library profile</label>
    {:else}<p class="hint">Your existing library profile is kept. These details belong to this imported CV.</p>{/if}
    <p class="hint">Name and email are required to include a profile in the saved composition.</p>
   </fieldset>
   </details>
   <details><summary>Target emphasis (optional)</summary>
   <fieldset><legend>Target emphasis (optional)</legend>
    <label for="roles">Target roles, comma separated</label><input id="roles" name="roleFamilies" value={draft.targeting.roleFamilies.join(', ')} />
    <label for="competencies">Competencies, comma separated</label><input id="competencies" name="competencies" value={draft.targeting.competencies.join(', ')} />
    <label for="keywords">Keywords, comma separated</label><input id="keywords" name="keywords" value={draft.targeting.keywords.join(', ')} />
    <label for="basis">How this emphasis is known</label><select id="basis" name="basis" bind:value={draft.targeting.basis}><option value="unspecified">Unspecified</option><option value="inferred">Inferred from the CV</option><option value="confirmed">Confirmed by me</option></select>
    <label for="notes">Notes</label><textarea id="notes" name="notes" rows="2" bind:value={draft.targeting.notes}></textarea>
   </fieldset>
   </details>
   <input type="hidden" name="blockCount" value={draft.blocks.length} />
   {#each draft.blocks as block, i}
    <fieldset class="block">
     <legend>Block {i + 1}</legend>
     <input type="hidden" name="origin-{i}" value={block.origin} />
     <label><input type="checkbox" name="included-{i}" bind:checked={block.included} /> Include in library</label>
     <label for="module-{i}">Section</label><select id="module-{i}" name="module-{i}" bind:value={block.module}>{#each MODULES as module}<option value={module}>{MODULE_LABELS[module]}</option>{/each}</select>
     <label for="label-{i}">Internal name</label><input id="label-{i}" name="label-{i}" bind:value={block.label} maxlength="120" />
     {#key block.module}<EntryFields module={block.module} data={block.data} idPrefix="b{i}" namePrefix="b{i}-" />{/key}
     {#if block.warnings.length}<ul class="warnings">{#each block.warnings as warning}<li>{warning}</li>{/each}</ul>{/if}
     <label for="text-{i}">Wording</label><textarea id="text-{i}" name="text-{i}" rows="6" bind:value={block.text}></textarea>
     <button type="button" disabled={!block.text.includes('\n')} onclick={() => split(i)}>Split after first line</button>
     <label for="items-{i}">Bullets / skills — one per line</label><textarea id="items-{i}" name="items-{i}" rows="4" bind:value={block.itemText}></textarea>
     <ReconcileBlock {block} index={i} texts={block.itemText.split('\n').map(text => text.trim()).filter(Boolean)} library={data.library} bind:reconciliation={block.reconciliation} />
     <details><summary>Source text</summary><pre>{block.sourceExcerpt || 'Added during review'}</pre></details>
    </fieldset>
   {/each}
   <button type="button" onclick={add}>Add a block</button>
   <div class="actions"><button>Save review draft</button><button formaction="?/approve">Approve and add to library</button></div>
   <p class="hint">Approval uses your chosen matches and keeps separate entries where requested. Save the draft to refresh suggestions after editing factual fields.</p>
  </form>
  <details><summary>Correct extracted text and rebuild suggestions</summary>
   <p>This replaces the current review blocks. Save any wording you want to keep before rebuilding.</p>
   <form method="POST" action="?/reparse"><label for="rawText">Extracted or pasted CV text</label><textarea id="rawText" name="rawText" rows="16" maxlength="200000">{data.review.source.extractedText ?? ''}</textarea><button>Rebuild review from this text</button></form>
  </details>
 {/if}
 <details><summary>Remove this import and original file</summary><p>Already approved library content and compositions are kept.</p><form method="POST" action="?/discard"><button>Remove import and original</button></form></details>
</section>
<style>
 .window { max-width: 110ch; }
 fieldset { min-width: 0; margin: 1rem 0; padding: 1rem; border: 1px solid var(--dim); }
 legend { color: var(--accent); }
 pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; }
 textarea, input:not([type='checkbox']), select { max-width: 100%; }
 .actions { display: flex; flex-wrap: wrap; gap: 1rem; margin: 1rem 0; }
 .warnings { color: var(--accent); padding-left: 2ch; }
 details { margin: 1rem 0; }
</style>
