import ts from "typescript";
import MagicString from "magic-string";
import { parse } from "@astrojs/compiler";
import {sourceSha,sourceIdentities,astroSignature} from "@three-acts/editor-source/identity";
import { dirname, relative, resolve } from "node:path";

const ignored = new Set(["script", "style", "link", "meta", "title", "svg", "source"]);
const componentNames = /^(?:Image|Prose\.Root|Button\.(?:Root|Link)|Grid\.Root|Section\.(?:Root|Container)|Typography\.(?:Display|Title|Lede|Eyebrow))$/;
const alias = "__threeActsElementProps";
const quoted = value => JSON.stringify(value);
function relativeImport(file, root, name) {
  const path = relative(dirname(file), resolve(root, "src/lib/" + name)).replaceAll("\\", "/");
  return quoted(path.startsWith(".") ? path : "./" + path);
}
function helperImport(file, root) {
  const path = relative(dirname(file), resolve(root, "src/lib/design")).replaceAll("\\", "/");
  return `import { editorElementProps as ${alias} } from ${quoted(path.startsWith(".") ? path : "./" + path)};\n`;
}
function identities(file,root) {return sourceIdentities(relative(root,file).replaceAll("\\","/"));}

export function instrumentJsx(source, file, root) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const output = new MagicString(source);
  const identity = identities(file, root);
  let changed = false;
  function visit(node, hidden = false) {
    const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
    if (opening) {
      const name = opening.tagName.getText(ast);
      hidden ||= ignored.has(name);
      let owner = node.parent;
      while (owner && !ts.isFunctionDeclaration(owner) && !ts.isVariableDeclaration(owner)) owner = owner.parent;
      const id = identity((owner?.name?.getText(ast) ?? "") + ":" + node.getText(ast));
      const props = opening.attributes.properties;
      const forwarded = opening.attributes.properties.some(prop => ts.isJsxSpreadAttribute(prop) && prop.expression.getText(ast).includes("componentAttributes("));
      const eligible = !hidden && (/^[a-z][a-z0-9-]*$/.test(name) || componentNames.test(name) || forwarded);
      if (eligible) {
        const separate = [], entries = [];
        for (const prop of props) {
          if (ts.isJsxSpreadAttribute(prop)) entries.push(`...(${prop.expression.getText(ast)})`);
          else {
            const key = prop.name.getText(ast), initializer = prop.initializer;
            if (["key", "ref"].includes(key)) { separate.push(prop.getText(ast)); continue; }
            const value = !initializer ? "true" : ts.isStringLiteral(initializer) ? quoted(initializer.text) : ts.isJsxExpression(initializer) ? initializer.expression?.getText(ast) ?? "undefined" : initializer.getText(ast);
            entries.push(`${quoted(key)}: (${value})`);
          }
        }
        const sourceReference = {path: "apps/web/" + relative(root, file).replaceAll("\\", "/"), start: opening.getStart(ast), sha: sourceSha(source)};
        // Forwarded roots retain the source reference supplied by their caller.
        if (!(/\/components\/ui\/image\//.test(file) && name === "img")) entries.push(`${quoted(forwarded ? "data-editor-definition-source" : "data-editor-source")}: ${quoted(JSON.stringify(sourceReference))}`);
        output.overwrite(opening.getStart(ast), opening.end, `<${name}${separate.length ? " " + separate.join(" ") : ""} {...${alias}(${quoted(id)}, {${entries.join(",")}})}${ts.isJsxSelfClosingElement(opening) ? " /" : ""}>`);
        changed = true;
      }
      const forwardedRoot = /\/components\/(?:ui\/(?:button|typography)|layout\/(?:grid|section))\//.test(file) && props.some(prop => ts.isJsxSpreadAttribute(prop) && prop.expression.getText(ast).includes("componentAttributes(")) || /\/components\/ui\/image\//.test(file) && name === "img";
      if (eligible && !forwardedRoot && name !== "Prose.Root") {
        const child = ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent);
        output.appendRight(node.getStart(ast), `${child ? "{" : ""}__threeActsNode(`);
        output.appendLeft(node.end, `, ${quoted(id)})${child ? "}" : ""}`);
        changed = true;
      }
    }
    ts.forEachChild(node, child => visit(child, hidden));
  }
  visit(ast);
  if (!changed) return null;
  output.prepend(helperImport(file, root) + `import { editorNode as __threeActsNode } from ${relativeImport(file, root, "editor-additions")};\n`);
  return { code: output.toString(), map: output.generateMap({ hires: true, source: file, includeContent: true }) };
}

/** Astro positions are byte offsets; convert before editing JS strings. */
export async function instrumentAstro(source, file, root) {
  const { ast } = await parse(source, { position: true });
  const output = new MagicString(source);
  const offset = value => Buffer.from(source).subarray(0, value).toString("utf8").length;
  const identity = identities(file, root);
  let changed = false;
  function visit(node, hidden = false) {
    if (node.type === "element" || node.type === "component" || node.type === "custom-element") {
      hidden ||= ignored.has(node.name) || node.name === "head";
      const id = identity(astroSignature(node));
      const attrs = node.attributes;
      if (!hidden && node.name !== "slot" && node.position?.start && (node.type !== "component" || componentNames.test(node.name))) {
        const start = offset(node.position.start.offset);
        const separate = [], entries = [];
        for (const attr of attrs) {
          if (attr.name === "slot" || attr.name.includes(":") && attr.name !== "class:list") {
            const value = attr.kind === "empty" ? "" : attr.kind === "expression" ? `={${attr.value}}` : `=${attr.raw || quoted(attr.value)}`;
            separate.push(attr.name + value); continue;
          }
          if (attr.kind === "spread") entries.push(`...(${attr.value})`);
          else if (attr.kind === "shorthand") entries.push(`${quoted(attr.name)}: (${attr.name})`);
          else entries.push(`${quoted(attr.name === "class:list" ? "class" : attr.name)}: (${attr.kind === "empty" ? "true" : attr.kind === "expression" ? attr.value : attr.kind === "template-literal" ? attr.raw : quoted(attr.value)})`);
        }
        // Find the opening delimiter while ignoring quoted/JS attribute values.
        let cursor = start + node.name.length + 1, braces = 0, quote = null;
        for (; cursor < source.length; cursor++) {
          const char = source[cursor];
          if (quote) { if (char === "\\") cursor++; else if (char === quote) quote = null; }
          else if (["'", '"', "`"].includes(char)) quote = char;
          else if (char === "{") braces++;
          else if (char === "}") braces--;
          else if (char === ">" && braces === 0) break;
        }
        if (cursor === source.length) throw new Error(`Cannot read opening source tag in ${file}`);
        const selfClosing = source.slice(start, cursor).trimEnd().endsWith("/");
        const sourceReference = {path: "apps/web/" + relative(root, file).replaceAll("\\", "/"), start, sha: sourceSha(source)};
        entries.push(`${quoted("data-editor-source")}: ${quoted(JSON.stringify(sourceReference))}`);
        const explicitId = attrs.find(attr => attr.name === "data-editor-id" && attr.kind === "quoted")?.value;
        output.overwrite(start, cursor + 1, `<${node.name}${separate.length ? " " + separate.join(" ") : ""} {...${alias}(${quoted(id)}, {${entries.join(",")}}, ${quoted(node.type === "component" ? "className" : "class")})}${selfClosing ? " /" : ""}>`);
        const nodeEnd = Math.max(cursor + 1, offset(node.position.end.offset));
        const additions = position => `<ThreeActsEditorAdditions anchor=${quoted(explicitId || id)} position=${quoted(position)} />`;
        if (!selfClosing && !["img", "input", "br", "hr", "area", "base", "embed", "param", "track", "wbr", "html", "body"].includes(node.name)) {
          const end = nodeEnd;
          const closing = source.lastIndexOf("</", end - 1);
          if (closing > cursor) output.appendLeft(closing, additions("inside"));
        }
        if (!["html", "body"].includes(node.name)) { output.appendRight(start, "<Fragment>"); output.appendLeft(nodeEnd, additions("after") + "</Fragment>"); }
        changed = true;
      }
    }
    for (const child of node.children ?? []) visit(child, hidden);
  }
  visit(ast);
  if (!changed) return null;
  const imports = helperImport(file, root) + `import { EditorAdditions as ThreeActsEditorAdditions } from ${relativeImport(file, root, "editor-additions")};\n`;
  const frontmatter = ast.children.find(node => node.type === "frontmatter");
  if (frontmatter) output.appendLeft(offset(frontmatter.position.start.offset) + 3, "\n" + imports);
  else output.prepend(`---\n${imports}---\n`);
  return { code: output.toString(), map: output.generateMap({ hires: true, source: file, includeContent: true }) };
}

export function editorSourcePlugin(root) {
  return {
    name: "three-acts-editor-source", enforce: "pre",
    transform: { order: "pre", async handler(source, id) {
      const file = id.split("?")[0];
      if (file.includes("/src/lib/editor-additions.") || id.includes("?") || !file.startsWith(resolve(root, "src") + "/")) return null;
      return file.endsWith(".astro") ? instrumentAstro(source, file, root) : /\.[jt]sx$/.test(file) ? instrumentJsx(source, file, root) : null;
    } }
  };
}
