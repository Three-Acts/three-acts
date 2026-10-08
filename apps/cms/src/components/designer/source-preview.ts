import { sourceId, sourcePath, validateSourceContent } from '@three-acts/editor-source';
import type { EditorDocument, EditorWorkspace } from '@three-acts/static-content';
export function sourcePreviewKey(workspace: EditorWorkspace,email: string) {
  return `three-acts:editor:source-preview:v1:${email}:${workspace.repository??'local'}:${workspace.branch??'local'}`;
}
/** A verified source commit can be previewed while its website build catches
 * up. This cache never supplies code for a write and is rechecked on reload. */
export function readSourcePreview(key: string): EditorDocument[] {
  try {
    const values: unknown=JSON.parse(localStorage.getItem(key)??'[]');
    if(!Array.isArray(values)||values.length>20)return [];
    return values.flatMap(value=>{
      try {const path=sourcePath(value.id);if(value.id!==sourceId(path)||typeof value.sha!=='string'||!/^[a-f0-9]{40}$/.test(value.sha))return [];
        return [{id:value.id,label:path.split('/').at(-1)!,route:'/',kind:'source' as const,sourcePath:path,sha:value.sha,content:validateSourceContent(value.content) as unknown as EditorDocument['content']}];
      }catch{return [];}
    });
  }catch{return [];}
}
export function writeSourcePreview(key: string,documents: EditorDocument[]) {
  const existing=new Map(readSourcePreview(key).map(doc=>[doc.id,doc]));
  for(const doc of documents)if(doc.kind==='source')existing.set(doc.id,doc);
  try {localStorage.setItem(key,JSON.stringify([...existing.values()].slice(-20)));}catch{/* The durable source commit is already safe. */}
}
