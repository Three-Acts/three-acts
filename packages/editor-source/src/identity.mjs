import { createHash } from 'node:crypto';
export const sourceSha = code => createHash('sha1').update(`blob ${Buffer.byteLength(code)}\0${code}`).digest('hex');
export function sourceIdentities(path) {
  const fileId=createHash('sha256').update(path).digest('hex').slice(0,16),counts=new Map();
  return signature=>{const hash=createHash('sha256').update(signature).digest('hex').slice(0,16),count=(counts.get(hash)??0)+1;counts.set(hash,count);return `auto.${fileId}.${hash}.${count}`;};
}
export const astroSignature=node=>JSON.stringify([node.type,node.name,node.value,(node.attributes??[]).map(attr=>[attr.name,attr.kind,attr.value]),(node.children??[]).map(astroSignature)]);
