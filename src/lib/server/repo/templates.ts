import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { db } from '../db';
import { cvTemplates, sourceFiles, compositions, cvImports, sourceReferences } from '../db/schema';
import { templateStyleSchema } from '$lib/domain/style';
import { createSourceDocument, deleteSourceDocument, updateComposition } from './library';
import { validateUpload } from '../import-extract';
import { InvalidError, NotFoundError } from './errors';
const input=z.object({name:z.string().trim().min(1).max(200),style:templateStyleSchema});
export function listTemplates(owner:string){return db.select().from(cvTemplates).where(eq(cvTemplates.ownerId,owner)).all();}
export function getTemplate(owner:string,id:string){const row=db.select().from(cvTemplates).where(and(eq(cvTemplates.ownerId,owner),eq(cvTemplates.id,id))).get();if(!row)throw new NotFoundError('Template not found');return row;}
export function createTemplate(owner:string,value:unknown,reference?:{filename:string;bytes:Buffer}){
 const parsed=input.safeParse(value);if(!parsed.success)throw new InvalidError('Choose a template name and supported style choices.');
 return db.transaction(()=>{
  let referenceSourceId:string|null=null;
  if(reference){const mediaType=validateUpload(reference.filename,reference.bytes);referenceSourceId=createSourceDocument(owner,{filename:reference.filename.replace(/[\\/\x00-\x1f]/g,'_').slice(0,255),mediaType,sha256:createHash('sha256').update(reference.bytes).digest('hex')});db.insert(sourceFiles).values({sourceDocumentId:referenceSourceId,ownerId:owner,bytes:reference.bytes}).run();}
  const id=uuidv7();db.insert(cvTemplates).values({id,ownerId:owner,...parsed.data,referenceSourceId,createdAt:Date.now()}).run();return id;
 });
}
export function applyTemplate(owner:string,cvId:string,templateId:string|null){const template=templateId?getTemplate(owner,templateId):null;updateComposition(owner,cvId,{designKey:template?'reference':'classic',style:template?.style??{}});}
export function deleteTemplate(owner:string,id:string){db.transaction(()=>{
 const template=getTemplate(owner,id);db.delete(cvTemplates).where(and(eq(cvTemplates.ownerId,owner),eq(cvTemplates.id,id))).run();
 const source=template.referenceSourceId;if(!source)return;
 const used=db.select().from(cvTemplates).where(eq(cvTemplates.referenceSourceId,source)).get()||db.select().from(cvImports).where(eq(cvImports.sourceDocumentId,source)).get()||db.select().from(compositions).where(eq(compositions.sourceDocumentId,source)).get()||db.select().from(sourceReferences).where(eq(sourceReferences.sourceDocumentId,source)).get();
 if(!used)deleteSourceDocument(owner,source);
});}

export function createAndApplyTemplate(owner:string,cvId:string,value:unknown,reference?:{filename:string;bytes:Buffer}){return db.transaction(()=>{const id=createTemplate(owner,value,reference);applyTemplate(owner,cvId,id);return id;});}
