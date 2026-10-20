<script lang="ts">
 import type { EntryIn } from '$lib/domain/content';
 import type { ImportBlock, Reconciliation } from '$lib/domain/import';
 import { exactItem, factDifferences, factsFingerprint, itemDecision, numericDifference, suggestEntryMatches, suggestItemMatches } from '$lib/domain/reconcile';
 import { MODULE_FIELDS } from './fields';
 let { block, index, texts, library, reconciliation = $bindable(null) }: {
  block: ImportBlock; index: number; texts: string[]; library: EntryIn[];
  reconciliation?: Reconciliation | null;
 } = $props();
 const available = $derived(library.filter(entry => entry.module === block.module && !entry.archived));
 const matches = $derived(suggestEntryMatches(block, library));
 const selected = $derived(available.find(entry => entry.id === reconciliation?.entryId));
 const differences = $derived(selected ? factDifferences(block.data, selected.data) : []);
 const stale = $derived(selected && reconciliation && factsFingerprint(selected.data) !== reconciliation.libraryFacts);
 const display = (value: unknown) => value === null ? 'Present' : value === undefined || value === '' ? '(missing)' : String(value);
 const fieldLabel = (key: string) => MODULE_FIELDS[block.module].find(field => field.name === key)?.label ?? key;
 function choose(entryId: string) {
  const entry = available.find(value => value.id === entryId);
  reconciliation = entry ? { entryId, libraryFacts: factsFingerprint(entry.data), facts: 'unresolved', items: [] } : null;
 }
 function setItem(i: number, value: string) {
  if (!reconciliation) return;
  reconciliation = { ...reconciliation, items: [
   ...reconciliation.items.filter(item => item.index !== i),
   ...(value === 'auto' ? [] : [{ index: i, text: texts[i], itemId: value === 'new' ? null : value, confirmNumericDifference: false }])
  ] };
 }
 function confirmNumber(i: number, confirmed: boolean) {
  if (!reconciliation) return;
  reconciliation = { ...reconciliation, items: reconciliation.items.map(item => item.index === i && item.text === texts[i] ? { ...item, confirmNumericDifference: confirmed } : item) };
 }
</script>
<div class="reconcile">
 <h3>Match with your library</h3>
 {#if matches.length}
  <p class="hint">Possible matches — suggestions only:</p>
  <ul>{#each matches as match}<li><b>{match.label}</b>: {match.reasons.join(', ')}{match.differences.length ? `; ${match.differences.length} factual difference(s)` : '; matching facts'}</li>{/each}</ul>
 {:else}<p class="hint">No close match suggested. You can keep this separate or choose an existing entry below.</p>{/if}
 <label for="reuse-{index}">Save this block as</label>
 <select id="reuse-{index}" name="reuse-{index}" value={reconciliation?.entryId ?? ''} onchange={event => choose(event.currentTarget.value)}>
  <option value="">A separate library entry</option>
  {#each available as entry}<option value={entry.id}>Reuse: {entry.label} — {String(entry.data.organization ?? entry.data.institution ?? entry.data.issuer ?? '')} {String(entry.data.title ?? entry.data.name ?? entry.data.degree ?? entry.module)}{entry.data.start ? ` (${entry.data.start})` : ''}</option>{/each}
 </select>
 <input type="hidden" name="libraryFacts-{index}" value={reconciliation?.libraryFacts ?? ''} />
 {#if reconciliation && !selected}<p class="msg err">The chosen entry was deleted, archived or moved to another section. Choose again.</p>{/if}
 {#if selected && reconciliation}
  {#if stale}<p class="msg err">Library facts changed since this choice. Review its current facts before continuing.</p><button type="button" onclick={() => choose(selected.id)}>Review current library facts</button>{/if}
  {#if differences.length}
   <p class="msg err" role="status">Factual differences need a decision before reuse.</p>
   <div class="table-wrap"><table><thead><tr><th>Field</th><th>Imported CV</th><th>Library</th></tr></thead><tbody>
    {#each differences as difference}<tr><th>{fieldLabel(difference.field)}</th><td>{display(difference.imported)}</td><td>{display(difference.library)}</td></tr>{/each}
   </tbody></table></div>
   <label class="check"><input type="checkbox" name="useLibraryFacts-{index}" checked={reconciliation.facts === 'library'} onchange={event => { if (reconciliation) reconciliation = { ...reconciliation, facts: event.currentTarget.checked ? 'library' : 'unresolved' }; }} /> Use the library facts in this CV</label>
   <p class="hint">Or correct the imported fields, or choose a separate entry. Review the wording too: this choice changes structured fields only.</p>
  {:else}<p class="hint">Structured facts agree. Existing library facts and default wording are kept.</p>{/if}
  <details><summary>Existing entry facts and wordings</summary>
   <dl>{#each Object.entries(selected.data) as [key,value]}<dt>{fieldLabel(key)}</dt><dd>{display(value)}</dd>{/each}</dl>
   {#each selected.variants as variant}<p>{variant.text} {variant.isDefault ? '(default)' : ''}</p>{#if variant.targeting}<p class="hint">Roles: {variant.targeting.roleFamilies.join(', ') || 'unspecified'} · Keywords: {variant.targeting.keywords.join(', ') || 'unspecified'}</p>{/if}{/each}
  </details>
  {#if texts.length}
   <h4>Match individual bullets / skills</h4>
   <p class="hint">Automatic matching reuses unambiguous identical text only. Editing a bullet resets its match. Choose an existing achievement to attach an alternative wording, or keep a new achievement.</p>
   {#each texts as text, itemIndex}
    {@const decision = itemDecision(reconciliation, itemIndex, text)}
    {@const existing = selected.items.find(item => item.id === decision?.itemId && !item.archived)}
    {@const exact = exactItem(text, selected.items)}
    {@const suggestions = suggestItemMatches(text, selected.items)}
    <div class="item-match">
     <p><b>Incoming {itemIndex + 1}:</b> {text}</p>
     {#if suggestions.length}<ul class="hint">{#each suggestions as match}<li>Possible match: {match.text}{match.numericDifference ? ' — numerical details differ' : ''}</li>{/each}</ul>{/if}
     <input type="hidden" name="itemReviewedText-{index}-{itemIndex}" value={decision?.text ?? text} />
     <label for="itemReuse-{index}-{itemIndex}">Store this wording under</label>
     <select id="itemReuse-{index}-{itemIndex}" name="itemReuse-{index}-{itemIndex}" value={decision ? decision.itemId ?? 'new' : 'auto'} onchange={event => setItem(itemIndex, event.currentTarget.value)}>
      <option value="auto">Automatic: {exact ? 'reuse identical achievement' : 'new achievement'}</option>
      <option value="new">Always create a separate achievement</option>
      {#each selected.items.filter(item => !item.archived) as item}<option value={item.id}>Reuse: {(item.facts || item.variants[0]?.text || 'Achievement').slice(0,150)}</option>{/each}
     </select>
     {#if decision?.itemId && !existing}<p class="msg err">This achievement is no longer available. Choose again.</p>{/if}
     {#if existing}
      <details><summary>Existing achievement and wordings</summary>{#if existing.facts}<p>{existing.facts}</p>{/if}{#each existing.variants as variant}<p>{variant.text} {variant.isDefault ? '(default)' : ''}</p>{#if variant.targeting}<p class="hint">Roles: {variant.targeting.roleFamilies.join(', ') || 'unspecified'} · Keywords: {variant.targeting.keywords.join(', ') || 'unspecified'}</p>{/if}{/each}</details>
      {#if numericDifference(text,existing)}
       <p class="msg err">Numerical claims differ. Check the evidence before treating these as the same achievement.</p>
       <label class="check"><input type="checkbox" name="confirmNumeric-{index}-{itemIndex}" checked={decision?.confirmNumericDifference ?? false} onchange={event => confirmNumber(itemIndex,event.currentTarget.checked)} /> I confirm this wording describes the same achievement</label>
      {/if}
     {/if}
    </div>
   {/each}
  {/if}
 {/if}
 <p class="hint">Save the review draft to keep these choices. New wording/emphasis becomes an alternative; existing CVs retain their saved copies.</p>
</div>
<style>
 .reconcile { border-top: 1px solid var(--dim); margin-top: 1rem; padding-top: 1rem; }
 .reconcile h3, .reconcile h4 { font-size: 1em; color: var(--accent); }
 .table-wrap { overflow-x: auto; }
 td, th { overflow-wrap: anywhere; }
 .item-match { border: 1px solid var(--dim); padding: 1rem; margin: 1rem 0; }
 select { width: 100%; max-width: 100%; }
 .check { display: flex; align-items: start; gap: 1ch; }
 dd { overflow-wrap: anywhere; }
</style>
