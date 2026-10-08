import designSource from "@three-acts/static-content/documents/design.json";
import { cn } from "@three-acts/utils";
import { applyStyle, componentBaseClass, componentDefinitions, resolveProperties, type DesignDocument } from "@three-acts/design";

const design = designSource as DesignDocument;
export function elementClass(id: string, className = ""): string {
  return applyStyle(className, design.elements[id]);
}
export function componentIdentity(attributes: object): string | undefined {
  const props = attributes as Record<string, unknown>;
  const id = props["data-editor-id"] ?? props["data-static-field"];
  return typeof id === "string" ? id : undefined;
}
export function componentProps(name: string, id: string | undefined, props: Record<string, string>): Record<string, string> {
  return resolveProperties(design, name, id, props);
}
export function componentClass(name: string, props: Record<string, string>, callerClass = ""): string {
  return applyStyle(cn(componentBaseClass(name, props), callerClass), design.components[name]?.parts.root);
}
export function partClass(name: string, part: string, base = ""): string {
  return applyStyle(base, design.components[name]?.parts[part]);
}
export function componentAttributes(name: string, id: string | undefined, props: Record<string, string>, callerClass = "") {
  return {
    "data-editor-component": name,
    "data-editor-component-label": componentDefinitions[name].label,
    "data-editor-instance": id,
    "data-editor-source-props": JSON.stringify(props),
    "data-editor-caller-class": callerClass,
    "data-editor-part": "root"
  };
}
