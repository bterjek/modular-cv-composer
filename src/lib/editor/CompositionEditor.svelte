<script lang="ts">
 import { untrack } from 'svelte';
 import { enhance } from '$app/forms';
 import { beforeNavigate } from '$app/navigation';
 import EntryFields from './EntryFields.svelte';
 import { MODULES, HAS_ITEMS, type Module } from '$lib/domain/modules';
 import { MODULE_LABELS } from './fields';
 import { copyLibraryEntry, newCVEntry } from '$lib/domain/composition';
 import type { CompositionDocument } from '$lib/domain/library';
 import type { EntryIn } from '$lib/domain/content';
 let { cv, revision, library, form }: {cv:{name:string;document:CompositionDocument};revision:string;library:EntryIn[];form:{draft?:CompositionDocument;name?:string}|null|undefined} = $props();
 let document = $state<CompositionDocument>(untrack(()=>structuredClone(cv.document)));
 let name = $state(untrack(()=>cv.name));
 let module = $state<Module>('summary');
 let saving=$state(false);
 $effect(()=>{const source=form?.draft??cv.document;document=structuredClone(source);name=form?.name??cv.name;});
 const serialized=$derived(JSON.stringify(document));
 const dirty=$derived(serialized!==JSON.stringify(cv.document)||name!==cv.name);
 beforeNavigate(({cancel})=>{if(dirty&&!window.confirm('Leave without saving this CV?'))cancel();});
 function move<T>(array:T[],index:number,by:number){const target=index+by;if(target<0||target>=array.length)return;[array[index],array[target]]=[array[target],array[index]];}
 const available=(m:Module)=>library.filter(entry=>entry.module===m&&!entry.archived);
</script>
<svelte:window onbeforeunload={event=>{if(dirty){event.preventDefault();event.returnValue='';}}}/>
<form method="POST" action="?/save" use:enhance={()=>{saving=true;return async({update})=>{try{await update({reset:false});}finally{saving=false;}};}} aria-busy={saving} data-primary class="composition-form">
 <fieldset class="save-area" disabled={saving}>
 <input type="hidden" name="revision" value={revision}/><input type="hidden" name="document" value={serialized}/>
 <label for="cv-name">CV name</label><input id="cv-name" name="name" bind:value={name} maxlength="200" required/>
 <p role="status">{saving?'Saving…':dirty?'Unsaved changes — save to refresh the page count and preview.':'Saved content — library changes do not affect this copy.'}</p>
 <button class="primary">Save CV</button>
 <details><summary>Contact details</summary>
  {#if document.profile}
   <label>Name<input aria-label="CV full name" bind:value={document.profile.fullName}/></label>
   <label>Email<input type="email" bind:value={document.profile.email}/></label>
   <label>Phone<input value={document.profile.phone??''} oninput={e=>{if(document.profile)document.profile.phone=e.currentTarget.value||null;}}/></label>
   <label>Location<input value={document.profile.location??''} oninput={e=>{if(document.profile)document.profile.location=e.currentTarget.value||null;}}/></label>
   {#each document.profile.links as link,i}
    <label>Link label<input bind:value={link.label}/></label><label>Web address<input type="url" bind:value={link.url}/></label>
    <button type="button" onclick={()=>document.profile?.links.splice(i,1)}>Remove link</button>
   {/each}
   <button type="button" onclick={()=>document.profile?.links.push({label:'',url:''})}>Add link</button>
   <button type="button" onclick={()=>document.profile=null}>Remove contact details</button>
  {:else}<button type="button" onclick={()=>document.profile={fullName:'',email:'',phone:null,location:null,links:[]}}>Add contact details</button>{/if}
 </details>
 {#each document.sections as section,s (section)}
  <fieldset class="cv-section"><legend>{section.title||MODULE_LABELS[section.module]}</legend>
   <label>Section title<input value={section.title??''} oninput={e=>section.title=e.currentTarget.value||null}/></label>
   <button type="button" disabled={s===0} onclick={()=>move(document.sections,s,-1)}>Section up</button>
   <button type="button" disabled={s===document.sections.length-1} onclick={()=>move(document.sections,s,1)}>Section down</button>
   <button type="button" onclick={()=>document.sections.splice(s,1)}>Remove section</button>
   {#each section.entries as entry,e (entry)}
    {@const shared=library.find(item=>item.id===entry.libraryEntryId)}
    <fieldset class="cv-entry"><legend>Entry {e+1}</legend>
     <EntryFields module={section.module} data={entry.data} idPrefix="cv-{s}-{e}" onChange={(key,value)=>{if(value==='')delete entry.data[key];else entry.data[key]=value;}}/>
     {#if shared?.variants.length}
      <label>Choose library wording<select aria-label="Entry library wording" value={entry.variantId??''} onchange={event=>{const v=shared.variants.find(v=>v.id===event.currentTarget.value);if(v){entry.variantId=v.id;entry.text=v.text;}}}>
       <option value="">Keep this CV's text</option>{#each shared.variants as v}<option value={v.id}>{v.text.slice(0,100)}</option>{/each}
      </select></label>
     {/if}
     <label>Description<textarea aria-label="Entry description" rows="4" value={entry.text??''} oninput={event=>entry.text=event.currentTarget.value||null}></textarea></label>
     {#each entry.items as item,i (item)}
      {@const original=shared?.items.find(bullet=>bullet.id===item.libraryItemId)}
      {#if original?.variants.length}
       <label>Choose bullet wording<select aria-label="Bullet library wording" value={item.variantId??''} onchange={event=>{const v=original.variants.find(v=>v.id===event.currentTarget.value);if(v){item.variantId=v.id;item.text=v.text;}}}>
        <option value="">Keep this CV's text</option>{#each original.variants as v}<option value={v.id}>{v.text.slice(0,100)}</option>{/each}
       </select></label>
      {/if}
      <label>Bullet {i+1}<textarea aria-label="Bullet text" rows="2" bind:value={item.text} required></textarea></label>
      <button type="button" disabled={i===0} onclick={()=>move(entry.items,i,-1)}>Bullet up</button>
      <button type="button" disabled={i===entry.items.length-1} onclick={()=>move(entry.items,i,1)}>Bullet down</button>
      <button type="button" onclick={()=>entry.items.splice(i,1)}>Remove bullet</button>
     {/each}
     {#if HAS_ITEMS[section.module]}<button type="button" onclick={()=>entry.items.push({libraryItemId:null,variantId:null,text:''})}>Add bullet</button>
      {#if shared}<label>Add another library bullet<select aria-label="Add library bullet" onchange={event=>{const item=shared.items.find(i=>i.id===event.currentTarget.value);if(item){const v=item.variants.find(v=>v.isDefault)??item.variants[0];entry.items.push({libraryItemId:item.id,variantId:v?.id??null,text:v?.text??item.facts??''});}event.currentTarget.value='';}}>
       <option value="">Choose…</option>{#each shared.items.filter(i=>!i.archived) as item}<option value={item.id}>{item.facts||item.variants[0]?.text||'Achievement'}</option>{/each}
      </select></label>{/if}
     {/if}
     <button type="button" disabled={e===0} onclick={()=>move(section.entries,e,-1)}>Entry up</button>
     <button type="button" disabled={e===section.entries.length-1} onclick={()=>move(section.entries,e,1)}>Entry down</button>
     <button type="button" onclick={()=>section.entries.splice(e,1)}>Remove entry</button>
    </fieldset>
   {/each}
   <button type="button" onclick={()=>section.entries.push(newCVEntry(section.module))}>Add new entry</button>
   <label>Add from library<select aria-label="Add library entry" onchange={event=>{const entry=available(section.module).find(e=>e.id===event.currentTarget.value);if(entry)section.entries.push(copyLibraryEntry(entry));event.currentTarget.value='';}}>
    <option value="">Choose…</option>{#each available(section.module) as entry}<option value={entry.id}>{entry.label}</option>{/each}
   </select></label>
  </fieldset>
 {/each}
 <label for="new-section">New section</label><select id="new-section" bind:value={module}>{#each MODULES as m}<option value={m}>{MODULE_LABELS[m]}</option>{/each}</select>
 <button type="button" onclick={()=>document.sections.push({module,title:null,entries:[]})}>Add section</button>
 <button class="primary">Save CV</button>
</fieldset>
</form>
<style>.save-area{border:0;padding:0;margin:0;min-width:0}.cv-section{margin:1rem 0;padding:1rem}.cv-entry{margin:1rem 0;padding:1rem}details{margin:1rem 0}textarea{white-space:pre-wrap}</style>
