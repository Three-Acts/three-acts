import assert from "node:assert/strict";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve, extname } from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { contentDefinitions, contentPath, serializeContent, validateContent, type ContentObject } from "@three-acts/static-content";
import { validateDesign } from "@three-acts/design";
const root=process.cwd();
const fixture=JSON.parse(await readFile(resolve(root,"apps/cms/tests/designer/artifacts/direct-authoring-committed.json"),"utf8")) as {documents:Array<{id:string;content:ContentObject}>};
const sources=new Map(fixture.documents.map(doc=>[doc.id,validateContent(doc.id,doc.content)]));
const design=validateDesign(sources.get("design"));
const additions=Object.values(design.additions??{}).flat();
assert.ok(additions.some(node=>node.text==="Nested content persists in source"));
const changed=Object.entries(design.elements).find(([,style])=>style.utilities.includes("pb-[calc(3rem_+_2px)]"));
assert.ok(changed);
const originals=new Map(await Promise.all(contentDefinitions.map(async doc=>[contentPath(doc.id),await readFile(resolve(root,contentPath(doc.id)))] as const)));
let server:ReturnType<typeof createServer>|undefined;
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try {
  for(const doc of contentDefinitions) await writeFile(resolve(root,contentPath(doc.id)),serializeContent(sources.get(doc.id)!));
  const build=spawnSync("npm",["run","build:web"],{cwd:root,env:{...process.env,CONTENT_SOURCE:"mock",PUBLIC_EDITOR_PREVIEW:"false"},encoding:"utf8"});
  if(build.status!==0) throw new Error(build.stdout+build.stderr);
  const dist=resolve(root,"apps/web/dist");
  const files=await readdir(dist,{recursive:true});
  for(const file of files.filter(file=>file.endsWith(".html"))) assert.equal(/three-acts-editor-config|\/editor-preview\.js|HomeCompositionPreview|CmsDraftPreview/.test(await readFile(resolve(dist,file),"utf8")),false,`Private preview in ${file}`);
  server=createServer(async(req,res)=>{
    try {
      const url=new URL(req.url!,"http://local.invalid");
      const path=resolve(dist,`.${url.pathname==="/"?"/index.html":url.pathname}`);
      if(!path.startsWith(dist+"/")){res.writeHead(404).end();return;}
      const mime:Record<string,string>={".html":"text/html",".css":"text/css",".js":"text/javascript",".png":"image/png",".svg":"image/svg+xml",".avif":"image/avif"};
      res.setHeader("Content-Type",mime[extname(path)]??"application/octet-stream");res.end(await readFile(path));
    }catch{res.writeHead(404).end();}
  });
  await new Promise<void>(done=>server!.listen(0,"127.0.0.1",done));
  const address=server.address();assert.ok(address&&typeof address!=="string");
  browser=await chromium.launch();const page=await browser.newPage();
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:1000});await page.goto(`http://127.0.0.1:${address.port}/privacy/index.html`);
    assert.equal(await page.locator(`[data-editor-id="${changed[0]}"]`).evaluate(el=>getComputedStyle(el).paddingBottom),width>=1280?"72px":"50px");
    for(const node of additions){
      const element=page.locator(`[data-editor-id="${node.id}"]`);
      assert.equal(await element.count(),1,`Exactly one ${node.type} in SSR`);
      if(node.text) assert.equal(await element.textContent(),node.text);
      if(node.type==="Button.Link") assert.match(await element.getAttribute("class")??"",/border-line-strong/);
    }
    const nested=additions.find(node=>node.text==="Nested content persists in source")!;
    assert.equal(await page.locator(`[data-editor-id="${nested.id}"]`).evaluate(el=>el.parentElement?.hasAttribute("data-editor-added")),true);
    await page.screenshot({path:resolve(root,`apps/cms/tests/designer/artifacts/direct-authoring-built-${width}.png`),fullPage:true});
  }
  console.log(`Direct Tailwind calculation, added headings, nested Div, component variant and exact node identities persist in normal SSR at 1280px and 390px; ${files.filter(file=>file.endsWith(".html")).length} pages exclude private preview.`);
}finally{
  await Promise.allSettled([browser?.close(),server?new Promise<void>(done=>server!.close(()=>done())):Promise.resolve()]);
  for(const[path,bytes]of originals) await writeFile(resolve(root,path),bytes);
}
