import ts from "typescript";
import MagicString from "magic-string";
import { parse } from "@astrojs/compiler";
import {sourceSha,sourceIdentities,astroSignature} from './identity.mjs';
export {sourceSha};
import { applyStyle } from '@three-acts/design';
const identities = path => sourceIdentities(path.replace(/^apps\/web\//,''));
const ignored = new Set([
  "script",
  "style",
  "link",
  "meta",
  "title",
  "svg",
  "source",
  "head",
]);
const known =
  /^(?:Image|Prose\.Root|Button\.(?:Root|Link)|Grid\.Root|Section\.(?:Root|Container)|Typography\.(?:Display|Title|Lede|Eyebrow))$/;
const classHelper = "__threeActsSourceClass";
function astroAttributeEnd(code, start, attr) {
  let cursor = start + attr.name.length;
  while (/\s/.test(code[cursor] ?? "")) cursor++;
  if (code[cursor] !== "=") return start + attr.name.length;
  cursor++;
  while (/\s/.test(code[cursor] ?? "")) cursor++;
  if (attr.kind === "expression") return cursor + attr.value.length + 2;
  return cursor + (attr.raw?.length ?? attr.value.length);
}
function stringExpression(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e");
}
function mergeExpression(expression, style) {
  // clsx normalization handles Astro class:list, arrays and conditional objects;
  // cn keeps the project's Tailwind conflict semantics in the authored source.
  return `${classHelper}(${expression}, ${stringExpression(style.utilities.concat(style.customClasses).join(" "))})`;
}
export async function patchSource(code, path, edits) {
  if (!edits.length) return code;
  const output = new MagicString(code),
    identity = identities(path),
    requested = new Map();
  for (const edit of edits)
    requested.set(edit.start, [...(requested.get(edit.start) ?? []), edit]);
  let needsHelper = false;
  const editClass = (
    entry,
    classAttr,
    insertAt,
    classKey,
    expression,
    literal,
    identityExpression,
  ) => {
    const edits = requested.get(entry.start);
    if (!edits) return;
    const edit = edits[0];
    requested.delete(entry.start);
    let value;
    if (identityExpression && !edit.target.startsWith("component:")) {
      if (!/^id\(["'][^"']+["']\)$/.test(identityExpression))
        throw new Error(
          "This element has a dynamic identity that cannot be styled safely.",
        );
      const base = expression || stringExpression(literal ?? "");
      const values = edits.map(
        (edit) =>
          `(${identityExpression}) === ${stringExpression(edit.target)} ? ${stringExpression(edit.style.utilities.concat(edit.style.customClasses).join(" "))} : ''`,
      );
      value = `${classHelper}(${base}, ${values.join(", ")})`;
      needsHelper = true;
    } else if (edits.length > 1)
      throw new Error(
        "These source elements share a class definition. Edit the shared source once.",
      );
    else if (literal !== undefined)
      value = stringExpression(applyStyle(literal, edit.style));
    else if (!expression)
      value = stringExpression(
        edit.style.utilities.concat(edit.style.customClasses).join(" "),
      );
    else {
      value = mergeExpression(expression, edit.style);
      needsHelper = true;
    }
    const attr = `${classKey}={${value}}`;
    if (classAttr) output.overwrite(classAttr.start, classAttr.end, attr);
    else output.appendLeft(insertAt, " " + attr);
  };
  if (path.endsWith(".astro")) {
    const { ast } = await parse(code, { position: true }),
      offset = (n) => Buffer.from(code).subarray(0, n).toString("utf8").length;
    function visit(node, hidden = false) {
      if (["element", "component", "custom-element"].includes(node.type)) {
        hidden ||= ignored.has(node.name);
        const id = identity(astroSignature(node)),
          eligible =
            Boolean(node.position?.start) &&
            !hidden &&
            node.name !== "slot" &&
            (node.type !== "component" || known.test(node.name));
        if (eligible) {
          const start = offset(node.position.start.offset),
            attrs = node.attributes;
          // Freeze existing inferred identities before class edits change ancestors' fingerprints.
          if (
            !attrs.some((a) =>
              ["data-editor-id", "data-editor-part"].includes(a.name),
            )
          )
            output.appendLeft(
              start + node.name.length + 1,
              ` data-editor-id=${JSON.stringify(id)}`,
            );
          const attr = attrs.find((a) =>
            ["class", "className", "class:list"].includes(a.name),
          );
          if (
            requested.has(start) &&
            attrs.some((a) => a.kind === "spread") &&
            (!attr ||
              attrs.indexOf(attr) <
                attrs.findLastIndex((a) => a.kind === "spread"))
          )
            throw new Error(
              "This element forwards its classes from component properties. Edit its component properties or main component.",
            );
          editClass(
            { start },
            attr
              ? {
                  start: offset(attr.position.start.offset),
                  end: astroAttributeEnd(
                    code,
                    offset(attr.position.start.offset),
                    attr,
                  ),
                }
              : null,
            start + node.name.length + 1,
            node.type === "component" ? "className" : "class",
            attr?.kind === "expression"
              ? attr.value
              : attr?.kind === "template-literal"
                ? attr.raw
                : null,
            attr && !["expression", "template-literal"].includes(attr.kind)
              ? attr.value
              : undefined,
            attrs.find(
              (a) => a.name === "data-editor-id" && a.kind === "expression",
            )?.value,
          );
        }
      }
      for (const child of node.children ?? []) visit(child, hidden);
    }
    visit(ast);
    if (needsHelper) {
      const fm = ast.children.find((n) => n.type === "frontmatter"),
        declaration = `\nimport { cn as __threeActsSourceCn, clsx as __threeActsSourceClsx } from '@three-acts/utils';\nconst ${classHelper} = (...values) => __threeActsSourceCn(...values.map(value => __threeActsSourceClsx(value)));\n`;
      if (code.includes(`const ${classHelper} =`)) needsHelper = false;
      else if (fm)
        output.appendLeft(offset(fm.position.start.offset) + 3, declaration);
      else output.prepend(`---${declaration}---\n`);
    }
  } else {
    const ast = ts.createSourceFile(
      path,
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function visit(node, hidden = false) {
      const opening = ts.isJsxElement(node)
        ? node.openingElement
        : ts.isJsxSelfClosingElement(node)
          ? node
          : null;
      if (opening) {
        const name = opening.tagName.getText(ast);
        hidden ||= ignored.has(name);
        let owner = node.parent;
        while (
          owner &&
          !ts.isFunctionDeclaration(owner) &&
          !ts.isVariableDeclaration(owner)
        )
          owner = owner.parent;
        const id = identity(
          (owner?.name?.getText(ast) ?? "") + ":" + node.getText(ast),
        );
        const forwarded = opening.attributes.properties.some(
          (p) =>
            ts.isJsxSpreadAttribute(p) &&
            p.expression.getText(ast).includes("componentAttributes("),
        );
        if (
          !hidden &&
          (/^[a-z][a-z0-9-]*$/.test(name) || known.test(name) || forwarded)
        ) {
          const start = opening.getStart(ast),
            props = opening.attributes.properties;
          if (
            !forwarded &&
            !props.some(
              (p) =>
                ts.isJsxAttribute(p) &&
                ["data-editor-id", "data-editor-part"].includes(
                  p.name.getText(ast),
                ),
            )
          )
            output.appendLeft(
              opening.tagName.end,
              ` data-editor-id=${JSON.stringify(id)}`,
            );
          const attr = props.find(
            (p) =>
              ts.isJsxAttribute(p) &&
              ["class", "className"].includes(p.name.getText(ast)),
          );
          const lastSpread = props.findLastIndex((p) =>
            ts.isJsxSpreadAttribute(p),
          );
          const safeSpreads = props
            .filter((p) => ts.isJsxSpreadAttribute(p))
            .every(
              (p) =>
                p.expression.getText(ast).includes("componentAttributes(") ||
                (p.expression.getText(ast) === "props" &&
                  owner &&
                  ts.isFunctionDeclaration(owner) &&
                  owner.parameters.some(
                    (param) =>
                      ts.isObjectBindingPattern(param.name) &&
                      param.name.elements.some(
                        (item) => item.name.getText(ast) === "className",
                      ),
                  )),
            );
          if (
            requested.has(start) &&
            lastSpread >= 0 &&
            (!attr || props.indexOf(attr) < lastSpread) &&
            !safeSpreads
          )
            throw new Error(
              "This element forwards its classes from component properties. Edit its component properties or main component.",
            );
          const init = attr?.initializer,
            expr = init && ts.isJsxExpression(init) ? init.expression : null;
          editClass(
            { start },
            attr ? { start: attr.getStart(ast), end: attr.end } : null,
            opening.tagName.end,
            "className",
            expr?.getText(ast),
            init && ts.isStringLiteral(init)
              ? init.text
              : expr && ts.isStringLiteral(expr)
                ? expr.text
                : undefined,
            props
              .find(
                (p) =>
                  ts.isJsxAttribute(p) &&
                  p.name.getText(ast) === "data-editor-id" &&
                  p.initializer &&
                  ts.isJsxExpression(p.initializer),
              )
              ?.initializer.expression?.getText(ast),
          );
        }
      }
      ts.forEachChild(node, (c) => visit(c, hidden));
    }
    visit(ast);
    if (needsHelper && !code.includes(`const ${classHelper} =`))
      output.prepend(
        `import { cn as __threeActsSourceCn, clsx as __threeActsSourceClsx } from '@three-acts/utils';\nconst ${classHelper} = (...values${path.endsWith(".tsx") ? ": unknown[]" : ""}) => __threeActsSourceCn(...values.map(value => __threeActsSourceClsx(value${path.endsWith(".tsx") ? " as Parameters<typeof __threeActsSourceClsx>[0]" : ""})));\n`,
      );
  }
  if (requested.size)
    throw new Error(
      "The selected source element changed. Reload the canvas before editing.",
    );
  return output.toString();
}
/** Recover conditional instance class branches from actual authored source,
 * so a section duplicate also inherits styles committed before this session. */
export function authoredSourceEdits(code, path) {
  if (path.endsWith(".astro")) return [];
  const ast = ts.createSourceFile(
      path,
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ),
    edits = [];
  function visit(node) {
    const opening = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : null;
    if (opening) {
      const attr = opening.attributes.properties.find(
        (p) =>
          ts.isJsxAttribute(p) &&
          ["class", "className"].includes(p.name.getText(ast)),
      );
      if (attr?.initializer && ts.isJsxExpression(attr.initializer)) {
        const styles = new Map();
        function scan(value) {
          if (
            ts.isConditionalExpression(value) &&
            ts.isBinaryExpression(value.condition) &&
            value.condition.operatorToken.kind ===
              ts.SyntaxKind.EqualsEqualsEqualsToken &&
            ts.isStringLiteral(value.condition.right) &&
            ts.isStringLiteral(value.whenTrue) &&
            /^\(?id\(["'][^"']+["']\)\)?$/.test(
              value.condition.left.getText(ast),
            )
          ) {
            const target = value.condition.right.text,
              classes = value.whenTrue.text;
            styles.set(
              target,
              applyStyle(styles.get(target) ?? "", {
                utilities: classes.split(/\s+/).filter(Boolean),
                customClasses: [],
              }),
            );
          }
          ts.forEachChild(value, scan);
        }
        scan(attr.initializer);
        for (const [target, classes] of styles)
          edits.push({
            start: opening.getStart(ast),
            target,
            style: {
              utilities: classes.split(/\s+/).filter(Boolean),
              customClasses: [],
            },
          });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return edits;
}
