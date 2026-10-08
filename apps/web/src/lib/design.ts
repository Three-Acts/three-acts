import designSource from "@three-acts/static-content/documents/design.json";
import { cn } from "@three-acts/utils";
import { applyStyle, componentBaseClass, componentDefinitions, resolveProperties, type DesignDocument } from "@three-acts/design";

const design = designSource as DesignDocument;
function classList(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(classList).filter(Boolean).join(" ");
  if (value && typeof value === "object") return Object.entries(value).filter(([, enabled]) => enabled).map(([key]) => key).join(" ");
  return "";
}
/** Build-inferred metadata reads the actual source props once. Existing
 * caller identities and named component parts keep their original contract. */
export function editorElementProps(id: string, attributes: Record<string, unknown>, classKey = "className"): Record<string, unknown> {
  const identity = typeof attributes["data-editor-id"] === "string" ? attributes["data-editor-id"] as string : id;
  const raw = attributes[classKey];
  const base = classList(raw);
  if (typeof attributes["data-editor-component"] === "string") {
    const name=attributes["data-editor-component"] as string;
    if (!Object.hasOwn(componentDefinitions,name)) return attributes;
    const props=JSON.parse(String(attributes["data-editor-source-props"] || '{}')) as Record<string,string>;
    const resolved=resolveProperties(design,name,typeof attributes["data-editor-instance"]==='string'?attributes["data-editor-instance"]:undefined,props);
    const expected=new Set(cn(componentBaseClass(name,resolved),String(attributes["data-editor-caller-class"]??'')).split(/\s+/));
    const extras=base.split(/\s+/).filter(value=>!expected.has(value)).join(' ');
    return {...attributes,"data-editor-base-class":base,"data-editor-source-extras":extras};
  }
  if (attributes["data-editor-part"]) return {...attributes,"data-editor-base-class":base};
  return { ...attributes, "data-editor-id": identity, "data-editor-base-class": base, [classKey]: applyStyle(base, design.elements[identity]) };
}
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
