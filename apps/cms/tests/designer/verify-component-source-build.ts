import assert from "node:assert/strict";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve, extname } from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { contentDefinitions, contentPath, serializeContent, validateContent, type ContentObject } from "@three-acts/static-content";
const root=process.cwd();
const fixture=JSON.parse(await readFile(resolve(root,"apps/cms/tests/designer/artifacts/components-committed.json"),"utf8")) as {documents:Array<{id:string;content:ContentObject}>};
const sources=new Map(fixture.documents.map(doc=>[doc.id,validateContent(doc.id,doc.content)]));
const sourceDocuments=fixture.documents.filter(doc=>doc.id.startsWith("source:"));
assert.equal(sourceDocuments.length,2);
assert.ok(sourceDocuments.some(doc=>String(doc.content.code).includes("text-h3")));
const originals=new Map(await Promise.all([...contentDefinitions,...sourceDocuments].map(async doc=>[contentPath(doc.id),await readFile(resolve(root,contentPath(doc.id)))] as const)));
let server:ReturnType<typeof createServer>|undefined;
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try {
  for(const doc of contentDefinitions) await writeFile(resolve(root,contentPath(doc.id)),serializeContent(sources.get(doc.id)!));
  for(const doc of sourceDocuments) await writeFile(resolve(root,contentPath(doc.id)),String(doc.content.code));
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
    await page.setViewportSize({width,height:1000});await page.goto(`http://127.0.0.1:${address.port}/`);
    const hero=page.locator('[data-editor-component="HeroSection"]');
    assert.equal(await hero.evaluate(el=>getComputedStyle(el).paddingBottom),width>=1024?"96px":"48px");
    assert.equal(await hero.evaluate(el=>getComputedStyle(el).marginBottom),width>=1024?"16px":"0px");
    const button=page.locator('[data-editor-component="Button.Link"][data-editor-instance="home.hero_section.href_3"]');
    assert.equal(await button.evaluate(el=>el.classList.contains('border-line-strong')),true);
    assert.equal(await button.locator('[data-editor-part="label"]').evaluate(el=>el.classList.contains('text-h3')),true);
    const labels=page.locator('[data-editor-component="Button.Link"] [data-editor-part="label"]');
    assert.equal(await labels.evaluateAll(elements=>elements.every(el=>el.classList.contains('text-h3'))),true);
    assert.equal(await page.locator('[data-editor-component="Button.Root"] [data-editor-part="label"]').evaluateAll(elements=>elements.some(el=>el.classList.contains('text-h3'))),false);
    await page.screenshot({path:resolve(root,`apps/cms/tests/designer/artifacts/components-source-built-${width}.png`),fullPage:true});
  }
  console.log(`Source-authored main component padding, responsive margin, shared Link label and independent variant persist in normal desktop/mobile SSR; sibling Button.Root labels remain unchanged.`);
}finally{
  await Promise.allSettled([browser?.close(),server?new Promise<void>(done=>server!.close(()=>done())):Promise.resolve()]);
  for(const[path,bytes]of originals) await writeFile(resolve(root,path),bytes);
}
