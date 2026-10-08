/* Source renderer combines the component and element helpers used by the compiler. */
/* eslint-disable react-refresh/only-export-components */
import { cloneElement, createElement, Fragment, type ElementType, type ReactElement, type ReactNode } from "react";
import source from "@three-acts/static-content/documents/design.json";
import { applyStyle, type AddedElement, type DesignDocument } from "@three-acts/design";
import { Button } from "../components/ui/button";
import { Grid } from "../components/layout/grid";
import { Section } from "../components/layout/section";
import { Typography } from "../components/ui/typography";
const design = source as DesignDocument;
function registeredComponents() { return { "Button.Root": Button.Root, "Button.Link": Button.Link, "Grid.Root": Grid.Root, "Section.Root": Section.Root, "Section.Container": Section.Container, "Typography.Display": Typography.Display, "Typography.Title": Typography.Title, "Typography.Lede": Typography.Lede, "Typography.Eyebrow": Typography.Eyebrow }; }
function addedNode(node: AddedElement, anchor: string, index: number): ReactNode {
  const base = node.type === "img" ? "max-w-full" : "";
  const path = `design.additions.${anchor}.${index}`;
  const props: Record<string, unknown> = { ...node.attributes, "data-editor-added": "", "data-editor-added-path": `additions.${anchor}.${index}`, "data-editor-id": node.id, "data-editor-base-class": base, className: applyStyle(base, design.elements[node.id]), "data-static-field": `${path}.text` };
  const element = createElement((registeredComponents()[node.type as keyof ReturnType<typeof registeredComponents>] ?? node.type) as ElementType, props, node.type === "img" ? undefined : node.text);
  return editorNode(element as ReactElement<Record<string, unknown>>, node.id);
}
export function EditorAdditions({ anchor, position }: { anchor: string; position: "inside" | "after" }): ReactNode {
  return (design.additions?.[anchor] ?? []).map((node, index) => node.position === position ? <Fragment key={node.id}>{addedNode(node, anchor, index)}</Fragment> : null);
}
/** The wrapper returns the original element when it has no additions. React
 * children and Astro SSR use the same saved source, without extra DOM wrappers. */
export function editorNode(element: ReactElement<Record<string, unknown>>, inferredId: string): ReactElement {
  const anchor = typeof element.props["data-editor-id"] === "string" ? element.props["data-editor-id"] as string : inferredId;
  const additions = design.additions?.[anchor];
  if (!additions?.length) return element;
  const inside = additions.some(node => node.position === "inside");
  const updated = inside ? cloneElement(element, {}, element.props.children as ReactNode, <EditorAdditions anchor={anchor} position="inside"/>) : element;
  return <Fragment key={element.key}>{updated}<EditorAdditions anchor={anchor} position="after"/></Fragment>;
}
