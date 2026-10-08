import assert from "node:assert/strict";
import test from "node:test";
import {readSourcePreview,writeSourcePreview,sourcePreviewKey} from "../../src/components/designer/source-preview";
import type {EditorDocument,EditorWorkspace} from "@three-acts/static-content";
test("committed preview cache isolates repository and user, rejects forged paths and preserves original source",()=>{
 const values=new Map<string,string>();
 Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)}});
 try {
  const key=sourcePreviewKey({repository:"test/site",branch:"main"} as EditorWorkspace,"client@example.com");
  const doc={id:"source:apps/web/src/pages/privacy.astro",kind:"source",sha:"a".repeat(40),content:{code:'<p class="pb-6">Privacy</p>',edits:[{start:0,target:"privacy",style:{utilities:["pb-6"],customClasses:[]}}]}} as unknown as EditorDocument;
  writeSourcePreview(key,[doc]);assert.deepEqual(readSourcePreview(key)[0].content,doc.content);
  assert.deepEqual(readSourcePreview(sourcePreviewKey({repository:"other/site",branch:"main"} as EditorWorkspace,"client@example.com")),[]);
  values.set(key,JSON.stringify([{...doc,id:"source:apps/api/api/editor/source.ts"}]));assert.deepEqual(readSourcePreview(key),[]);
  values.set(key,'broken');assert.deepEqual(readSourcePreview(key),[]);
 }finally {delete (globalThis as {localStorage?:Storage}).localStorage;}
});
