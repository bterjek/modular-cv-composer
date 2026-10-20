import { db } from '../db';
import { createComposition, getComposition, updateComposition } from './library';
import { createEntry, createItem, createVariant, getProfile } from './content';
import { InvalidError } from './errors';
import { HAS_ITEMS } from '$lib/domain/modules';
import { labelFor } from '$lib/editor/fields';
import type { CompositionDocument } from '$lib/domain/library';
import { createHash } from 'node:crypto';
export const compositionRevision = (cv: ReturnType<typeof getComposition>) => createHash('sha256').update(JSON.stringify([cv.name,cv.document,cv.designKey,cv.style,cv.updatedAt])).digest('hex');
export function saveComposition(owner: string, id: string, revision: string, patch: { name: string; document: CompositionDocument }) {
 db.transaction(() => {
  const cv=getComposition(owner,id);
  if(compositionRevision(cv)!==revision)throw new InvalidError('This CV changed in another window. Reload before saving; copy your unsaved text first.');
  updateComposition(owner,id,patch);
 });
}
export function newComposition(owner: string, name: string) { return createComposition(owner,{name,document:{version:1,profile:getProfile(owner),sections:[]}}); }
export function duplicateComposition(owner: string,id:string) { const cv=getComposition(owner,id); return createComposition(owner,{...cv,name:(cv.name+' (copy)').slice(0,200)}); }
/** Explicitly publish one copied entry as NEW library content, never rewrite shared facts. */
export function publishCompositionEntry(owner:string,id:string,revision:string,sectionIndex:number,entryIndex:number) {
 return db.transaction(() => {
  const cv=getComposition(owner,id);
  if(compositionRevision(cv)!==revision)throw new InvalidError('Save or reload this CV before copying an entry to the library.');
  const section=cv.document.sections[sectionIndex], entry=section?.entries[entryIndex];
  if(!entry)throw new InvalidError('Choose an existing saved entry.');
  if(entry.items.length&&!HAS_ITEMS[section.module])throw new InvalidError('This section does not support bullets.');
  const entryId=createEntry(owner,{module:section.module,label:labelFor(section.module,entry.data),data:entry.data});
  if(entry.text?.trim())createVariant(owner,{entryId,text:entry.text,isDefault:true});
  for(const bullet of entry.items){const itemId=createItem(owner,entryId);createVariant(owner,{itemId,text:bullet.text,isDefault:true});}
  return entryId;
 });
}
