import { cn, cv } from "@three-acts/utils";
import utilities from "./utilities.json";
import candidates from "./utility-candidates.json";
import { buttonConfig, gridConfig } from "./components";
export type ButtonVariant = keyof typeof buttonConfig.variants.variant;
export type ButtonSize = keyof typeof buttonConfig.variants.size;
export type GridCols = keyof typeof gridConfig.variants.cols extends `${infer Value extends number}` ? Value : never;

export const breakpoints = { base: "Base", landscape: "Landscape · 768px+", tablet: "Tablet · 1024px+", desktop: "Desktop · 1280px+" } as const;
export type Breakpoint = keyof typeof breakpoints;
export const utilityControls = utilities;
export type UtilityProperty = keyof typeof utilities;
export type StyleChange = { utilities: string[]; customClasses: string[] };
export type ComponentDefinition = {
  label: string; source: string; base: string | readonly string[];
  variants: Record<string, Record<string, readonly string[]>>;
  defaultVariants: Record<string, string>;
  parts: Record<string, string>;
};
const simple = (label: string, source: string, base: string): ComponentDefinition => ({ label, source, base, variants: {}, defaultVariants: {}, parts: { root: label } });
const buttonDefinition = { ...buttonConfig, source: "apps/web/src/components/ui/button/button.tsx", parts: { root: "Button", label: "Label", icon: "Icon" } };
export const componentDefinitions: Record<string, ComponentDefinition> = {
  "Button.Link": { ...buttonDefinition, label: "Button link" },
  "Button.Root": { ...buttonDefinition, label: "Button" },
  "Grid.Root": { ...gridConfig, label: "Grid", source: "apps/web/src/components/layout/grid/grid.tsx", parts: { root: "Grid" } },
  "Section.Root": simple("Section", "apps/web/src/components/layout/section/section.tsx", "py-section-sm landscape:py-section-md desktop:py-section"),
  "Section.Container": simple("Container", "apps/web/src/components/layout/section/section.tsx", "mx-auto w-full max-w-content px-gutter"),
  "Typography.Display": simple("Display heading", "apps/web/src/components/ui/typography/typography.tsx", "text-display font-normal text-ink"),
  "Typography.Title": simple("Section heading", "apps/web/src/components/ui/typography/typography.tsx", "text-h2 font-normal text-ink"),
  "Typography.Lede": simple("Lede", "apps/web/src/components/ui/typography/typography.tsx", "max-w-2xl text-lede text-ink"),
  "Typography.Eyebrow": simple("Eyebrow", "apps/web/src/components/ui/typography/typography.tsx", "flex items-center gap-2 text-small uppercase tracking-eyebrow text-ink"),
  "HeroSection": simple("Hero", "apps/web/src/components/home/hero-section.tsx", "pb-8 pt-[75px]"),
};
const componentStylers = Object.fromEntries(Object.entries(componentDefinitions).map(([name, definition]) => [name, cv(definition)]));
export type DesignDocument = {
  version: 1;
  elements: Record<string, StyleChange>;
  components: Record<string, { parts: Record<string, StyleChange> }>;
  instances: Record<string, { component: string; props: Record<string, string> }>;
  customCss: Record<string, Record<string, string>>;
};
export const emptyDesign = (): DesignDocument => ({ version: 1, elements: {}, components: {}, instances: {}, customCss: {} });
const candidateSet = new Set(candidates);
const identifier = /^[a-zA-Z][a-zA-Z0-9_.:-]{0,179}$/;
const forbiddenKeys = new Set(["__proto__", "constructor", "prototype"]);
const cssSelector = /^\.[a-zA-Z][a-zA-Z0-9_-]{0,79}(?::(?:hover|focus|focus-visible|active))?$/;
const cssProperties = new Set(["display", "position", "top", "right", "bottom", "left", "z-index", "width", "height", "min-width", "max-width", "min-height", "max-height", "padding", "padding-top", "padding-right", "padding-bottom", "padding-left", "margin", "margin-top", "margin-right", "margin-bottom", "margin-left", "gap", "row-gap", "column-gap", "grid-template-columns", "flex-direction", "align-items", "justify-content", "font-size", "font-weight", "line-height", "letter-spacing", "text-align", "color", "background-color", "border", "border-color", "border-width", "border-radius", "box-shadow", "opacity", "overflow", "transform", "transition"]);
function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length > 500) throw new Error(`${name}: expected an object with at most 500 entries.`);
  if (Object.keys(value).some(key => forbiddenKeys.has(key))) throw new Error(`${name}: invalid key.`);
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[], name: string) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error(`${name}: unknown field.`);
}
function style(value: unknown): StyleChange {
  const entry = object(value, "Style"); keys(entry, ["utilities", "customClasses"], "Style");
  if (!Array.isArray(entry.utilities) || entry.utilities.length > 100 || entry.utilities.some(c => typeof c !== "string" || !candidateSet.has(c))) throw new Error("Choose a supported Tailwind utility.");
  if (!Array.isArray(entry.customClasses) || entry.customClasses.length > 20 || entry.customClasses.some(c => typeof c !== "string" || !cssSelector.test(`.${c}`) || c.includes(":"))) throw new Error("Use a simple custom class name.");
  return { utilities: cn(...entry.utilities).split(/\s+/).filter(Boolean), customClasses: [...new Set(entry.customClasses)] };
}
export function validateDeclarations(input: unknown): Record<string, string> {
  const declarations = object(input, "Custom CSS");
  if (Object.keys(declarations).length > 50) throw new Error("Custom CSS: use at most 50 declarations.");
  const result: Record<string, string> = {};
  for (const [property, value] of Object.entries(declarations)) {
    if (!cssProperties.has(property) || typeof value !== "string" || !value.trim() || value.length > 300 || /[;{}<>\\]|\/\*|\*\/|@|!|url\s*\(|expression\s*\(|javascript|(?:^|\W)attr\s*\(/i.test(value)) throw new Error(`Custom CSS: unsupported or invalid ${property}.`);
    if (!/^[\w\s#.,%()+*/:-]+$/.test(value)) throw new Error(`Custom CSS: invalid ${property} value.`);
    result[property] = value.trim();
  }
  return result;
}
export function parseDeclarations(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split(";").map(line => line.trim()).filter(Boolean)) {
    const separator = line.indexOf(":");
    if (separator < 1) throw new Error("Use property: value; declarations.");
    const property = line.slice(0, separator).trim();
    if (Object.hasOwn(result, property)) throw new Error(`Duplicate ${property} declaration.`);
    result[property] = line.slice(separator + 1).trim();
  }
  return validateDeclarations(result);
}
export function validateDesign(input: unknown): DesignDocument {
  const doc = object(input, "Design"); keys(doc, ["version", "elements", "components", "instances", "customCss"], "Design");
  if (doc.version !== 1) throw new Error("Unsupported design document version.");
  const next = emptyDesign();
  for (const [id, entry] of Object.entries(object(doc.elements, "Elements"))) {
    if (!identifier.test(id)) throw new Error("Invalid element identity."); next.elements[id] = style(entry);
  }
  for (const [name, value] of Object.entries(object(doc.components, "Components"))) {
    const definition = componentDefinitions[name];
    if (!Object.hasOwn(componentDefinitions, name)) throw new Error("Unknown component definition.");
    const entry = object(value, "Component"); keys(entry, ["parts"], "Component");
    const parts: Record<string, StyleChange> = {};
    for (const [part, value] of Object.entries(object(entry.parts, "Component parts"))) {
      if (!Object.hasOwn(definition.parts, part)) throw new Error("Unknown component part."); parts[part] = style(value);
    }
    next.components[name] = { parts };
  }
  for (const [id, value] of Object.entries(object(doc.instances, "Instances"))) {
    if (!identifier.test(id)) throw new Error("Invalid component instance identity.");
    const entry = object(value, "Instance"); keys(entry, ["component", "props"], "Instance");
    if (typeof entry.component !== "string" || !Object.hasOwn(componentDefinitions, entry.component)) throw new Error("Unknown instance component.");
    const props: Record<string, string> = {};
    for (const [key, value] of Object.entries(object(entry.props, "Properties"))) {
      const variants = componentDefinitions[entry.component].variants;
      if (!Object.hasOwn(variants, key) || typeof value !== "string" || !Object.hasOwn(variants[key], value)) throw new Error(`Invalid component property ${key}.`);
      props[key] = value;
    }
    next.instances[id] = { component: entry.component, props };
  }
  for (const [selector, value] of Object.entries(object(doc.customCss, "Custom selectors"))) {
    if (!cssSelector.test(selector)) throw new Error("Use a class selector, optionally with :hover, :focus, :focus-visible or :active.");
    next.customCss[selector] = validateDeclarations(value);
  }
  if (JSON.stringify(next).length > 100000) throw new Error("Design document is too large.");
  return next;
}
export function designCss(doc: DesignDocument): string {
  return Object.entries(doc.customCss).map(([selector, declarations]) => `${selector}{${Object.entries(declarations).map(([p,v]) => `${p}:${v}`).join(";")}}`).join("\n");
}
export function resolveProperties(doc: DesignDocument, name: string, id: string | undefined, props: Record<string, string>): Record<string, string> {
  const entry = id ? doc.instances[id] : undefined;
  return { ...componentDefinitions[name]?.defaultVariants, ...props, ...(entry?.component === name ? entry.props : {}) };
}
export function componentBaseClass(name: string, props: Record<string, string>): string {
  return cn(componentStylers[name]?.(props) ?? "");
}
export function applyStyle(base: string, change?: StyleChange): string {
  return cn(base, ...(change?.utilities ?? []), ...(change?.customClasses ?? []));
}
export function setUtility(change: StyleChange, property: UtilityProperty, breakpoint: Breakpoint, utility: string): StyleChange {
  const prefix = breakpoint === "base" ? "" : `${breakpoint}:`;
  const options = new Set(utilityControls[property].classes.map(c => prefix+c));
  const remaining = change.utilities.filter(c => !options.has(c));
  return { ...change, utilities: utility ? cn(...remaining, prefix+utility).split(/\s+/).filter(Boolean) : remaining };
}
