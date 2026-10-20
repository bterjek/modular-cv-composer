import { z } from 'zod';
import { compositionDocumentSchema } from './library';
import { chatDocument } from './composition';
export const chatResponseSchema=z.object({format:z.literal('cv-composer/chat@1'),name:z.string().trim().min(1).max(200),document:compositionDocumentSchema});
export function parseChatResponse(text:string){
 if(text.length>500000)throw new Error('Use a response smaller than 500,000 characters.');
 const clean=text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
 const value=chatResponseSchema.parse(JSON.parse(clean));
 return {...value,document:chatDocument(value.document)};
}
