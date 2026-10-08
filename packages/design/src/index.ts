import { validateAdditions, type AddedElement } from "./additions";
export { additionLocation, insertAddition, moveAddition, removeAddition, basicElements, insertableComponents, validateAdditions, type AddedElement } from "./additions";
import { cn, cv } from "@three-acts/utils";
import utilities from "./utilities.json";
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
  "Layout.hero": simple("Hero section", "apps/web/src/components/home/hero-section.tsx", "block"),
  "Layout.stats": simple("Stats section", "apps/web/src/components/home/stat-section.tsx", "block"),
  "Layout.categories": simple("Shop by category section", "apps/web/src/components/home/shop-by-category-section.tsx", "block"),
  "Layout.products": simple("Featured products section", "apps/web/src/components/home/featured-products-section.tsx", "block"),
  "Layout.intro": simple("Intro section", "apps/web/src/components/home/intro-section.tsx", "block"),
  "Layout.journal": simple("Journal section", "apps/web/src/components/home/journal-section.tsx", "block"),
  "Layout.testimonials": simple("Testimonials section", "apps/web/src/components/home/testimonials-section.tsx", "block"),
  "Layout.faq": simple("FAQ teaser section", "apps/web/src/components/home/faq-teaser-section.tsx", "block"),
  "Layout.cta": simple("CTA section", "apps/web/src/components/home/cta-section.tsx", "block"),
};
const componentStylers = Object.fromEntries(Object.entries(componentDefinitions).map(([name, definition]) => [name, cv(definition)]));
export type DesignDocument = {
  version: 1;
  elements: Record<string, StyleChange>;
  components: Record<string, { parts: Record<string, StyleChange> }>;
  instances: Record<string, { component: string; props: Record<string, string> }>;
  customCss: Record<string, Record<string, string>>;
  additions?: Record<string, AddedElement[]>;
};
export const emptyDesign = (): DesignDocument => ({ version: 1, elements: {}, components: {}, instances: {}, customCss: {} });
/** Tailwind's dynamic grammar, including arbitrary CSS values/properties.
 * Values are compiled by Tailwind; this boundary excludes markup/rule escapes. */
export function validateUtility(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 500 || /[\s;{}<>\\]|\/\*|\*\/|javascript|expression\s*\(|url\s*\(/i.test(value)) throw new Error("Use a valid Tailwind utility or arbitrary value.");
  let depth = 0;
  for (const character of value) {
    if (character === "[") depth++;
    if (character === "]") depth--;
    if (depth < 0) throw new Error("Unbalanced Tailwind arbitrary value.");
  }
  if (depth !== 0) throw new Error("Unbalanced Tailwind arbitrary value.");
  return value;
}
export const utilityPrefixes: Record<UtilityProperty, string> = {
  paddingTop: "pt", paddingRight: "pr", paddingBottom: "pb", paddingLeft: "pl",
  marginTop: "mt", marginRight: "mr", marginBottom: "mb", marginLeft: "ml", display: "display",
  flexDirection: "flex-direction", alignItems: "align-items", justifyContent: "justify-content", gap: "gap",
  width: "w", height: "h", maxWidth: "max-w", fontSize: "text", fontWeight: "font", textAlign: "text-align",
  color: "color", backgroundColor: "bg", borderRadius: "rounded",
  gridTemplateColumns:"grid-cols",gridTemplateRows:"grid-rows",flexWrap:"flex-wrap",position: "position", minWidth:"min-w", minHeight:"min-h", maxHeight:"max-h",top:"top",right:"right",bottom:"bottom",left:"left",zIndex:"z-index",fontFamily:"font-family",lineHeight:"line-height",letterSpacing:"letter-spacing",textDecoration:"text-decoration",textTransform:"text-transform",overflow:"overflow",borderWidth:"border-width",borderColor:"border-color",borderStyle:"border-style",opacity:"opacity",boxShadow:"box-shadow",cursor:"cursor",pointerEvents:"pointer-events",aspectRatio:"aspect-ratio",objectFit:"object-fit",columnGap:"column-gap",rowGap:"row-gap",transform:"transform",transition:"transition"
};
export function propertyUtility(property: UtilityProperty, value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if ((utilityControls[property].classes as string[]).includes(raw)) return raw;
  if (utilityScope(raw) === "" && utilityProperty(raw) === property) return validateUtility(raw);
  const named = property === "color" ? `text-${raw}` : property === "backgroundColor" ? `bg-${raw}` : "";
  if (named && (utilityControls[property].classes as string[]).includes(named)) return named;
  const common:Partial<Record<UtilityProperty,Record<string,string>>> = {
    display:{none:'hidden'},flexDirection:{row:'flex-row',column:'flex-col','row-reverse':'flex-row-reverse','column-reverse':'flex-col-reverse'},
    alignItems:{'flex-start':'items-start','flex-end':'items-end',start:'items-start',end:'items-end',center:'items-center',stretch:'items-stretch',baseline:'items-baseline'},
    justifyContent:{'flex-start':'justify-start','flex-end':'justify-end',center:'justify-center','space-between':'justify-between','space-around':'justify-around','space-evenly':'justify-evenly'},
    textAlign:{left:'text-left',right:'text-right',center:'text-center',justify:'text-justify',start:'text-start',end:'text-end'},
    fontWeight:{'100':'font-thin','200':'font-extralight','300':'font-light','400':'font-normal','500':'font-medium','600':'font-semibold','700':'font-bold','800':'font-extrabold','900':'font-black',normal:'font-normal',bold:'font-bold'},
    textDecoration:{none:'no-underline',underline:'underline','line-through':'line-through',overline:'overline'},textTransform:{none:'normal-case',uppercase:'uppercase',lowercase:'lowercase',capitalize:'capitalize'},
    flexWrap:{nowrap:'flex-nowrap',wrap:'flex-wrap','wrap-reverse':'flex-wrap-reverse'},
    overflow:{visible:'overflow-visible',hidden:'overflow-hidden',scroll:'overflow-scroll',auto:'overflow-auto',clip:'overflow-clip'},
    borderStyle:{solid:'border-solid',dashed:'border-dashed',dotted:'border-dotted',none:'border-none',double:'border-double'},
    pointerEvents:{auto:'pointer-events-auto',none:'pointer-events-none'},objectFit:{cover:'object-cover',contain:'object-contain',fill:'object-fill',none:'object-none','scale-down':'object-scale-down'},position:{static:'static',relative:'relative',absolute:'absolute',fixed:'fixed',sticky:'sticky'},
  };
  const preferred=common[property]?.[raw];if(preferred)return preferred;
  const theme=raw.match(/^var\(--(?:text|color)-([a-z0-9-]+)\)$/);
  if(theme) {const utility=property==='fontSize'?`text-${theme[1]}`:property==='backgroundColor'?`bg-${theme[1]}`:property==='color'?`text-${theme[1]}`:'';if((utilityControls[property].classes as string[]).includes(utility))return utility;}
  const arbitraryPrefixes:Partial<Record<UtilityProperty,string>>={color:'text-[color:',backgroundColor:'bg-[color:',fontFamily:'font-[family-name:',fontWeight:'font-[weight:',lineHeight:'leading-[',letterSpacing:'tracking-[',borderWidth:'border-[length:',borderColor:'border-[color:',opacity:'opacity-[',boxShadow:'shadow-[',cursor:'cursor-[',aspectRatio:'aspect-[',objectFit:'object-[',zIndex:'z-[',columnGap:'gap-x-[',rowGap:'gap-y-['};
  if(arbitraryPrefixes[property])return validateUtility(`${arbitraryPrefixes[property]}${raw.replaceAll(' ','_')}]`);
  const prefix = utilityPrefixes[property];
  if(property==='gridTemplateColumns'||property==='gridTemplateRows') { const count=raw.match(/^repeat\((\d+),\s*minmax\(0,\s*1fr\)\)$/); return count ? validateUtility(`${prefix}-${count[1]}`) : validateUtility(`[${property==='gridTemplateColumns'?'grid-template-columns':'grid-template-rows'}:${raw.replaceAll(' ','_')}]`); }
  if(property==='flexWrap')return validateUtility(`[flex-wrap:${raw}]`);
  const pixels=raw.match(/^(-?\d+(?:\.\d+)?)px$/);
  if(pixels && /^(?:padding|margin|gap|width|height|minWidth|maxWidth|minHeight|maxHeight|top|right|bottom|left)/.test(property) && Number(pixels[1]) % 4 === 0) {
    const count=Number(pixels[1])/4;return validateUtility(`${count<0?"-":""}${prefix}-${Math.abs(count)}`);
  }

  if (["position","zIndex","fontFamily","lineHeight","letterSpacing","textDecoration","textTransform","overflow","borderWidth","borderColor","borderStyle","opacity","boxShadow","cursor","pointerEvents","aspectRatio","objectFit","columnGap","rowGap","transform","transition"].includes(property)) return validateUtility(`[${property.replace(/[A-Z]/g,letter=>"-"+letter.toLowerCase())}:${raw.replaceAll(" ","_")}]`);
  if (property === "fontSize") return validateUtility(`text-[length:${/^\d+(?:\.\d+)?$/.test(raw) ? raw + "px" : raw.replaceAll(" ", "_")}]`);
  if (property === "borderRadius" && /^\d+(?:\.\d+)?$/.test(raw)) return validateUtility(`rounded-[${raw}px]`);
  if (["display", "flex-direction", "align-items", "justify-content", "text-align", "color"].includes(prefix)) return validateUtility(`[${prefix}:${raw.replaceAll(" ", "_")}]`);
  if (/^-?\d+(?:\.\d+)?$/.test(raw) && !["fontSize", "fontWeight", "borderRadius"].includes(property)) return validateUtility(`${raw.startsWith("-") ? "-" : ""}${prefix}-${raw.replace(/^-/, "")}`);
  return validateUtility(`${prefix}-[${raw.replaceAll(" ", "_")}]`);
}
export function utilityProperty(value: string): UtilityProperty | null {
  const utility = value.slice(utilityScope(value).length).replace(/^!|!$/g, "");
  const native:Array<[UtilityProperty,RegExp]>=[['fontFamily',/^font-(?:sans|serif|mono|\[(?:family-name|family):)/],['lineHeight',/^leading-/],['letterSpacing',/^tracking-/],['opacity',/^opacity-/],['boxShadow',/^shadow(?:$|-)/],['cursor',/^cursor-/],['pointerEvents',/^pointer-events-/],['aspectRatio',/^aspect-/],['objectFit',/^object-(?:contain|cover|fill|none|scale-down)$/],['zIndex',/^-?z-/],['columnGap',/^gap-x-/],['rowGap',/^gap-y-/],['borderStyle',/^border(?:-[trblxyse])?-(?:solid|dashed|dotted|double|hidden|none)$/],['borderWidth',/^border(?:-[trblxyse])?(?:$|-\d+(?:\.\d+)?$|-\[(?:length:|\d|calc\())/],['borderColor',/^border(?:-[trblxyse])?-(?!solid|dashed|dotted|double|hidden|none|collapse|separate|spacing|opacity|\d|\[length:)/]];
  for(const[property,pattern]of native)if(pattern.test(utility))return property;
  for (const [property, control] of Object.entries(utilityControls)) {
    if ((control.classes as string[]).includes(utility)) return property as UtilityProperty;
    const prefix = utilityPrefixes[property as UtilityProperty];
    const cssProperty = property.replace(/[A-Z]/g, letter => "-" + letter.toLowerCase());
    if (utility.startsWith(`[${prefix}:`) || utility.startsWith(`[${cssProperty}:`)) return property as UtilityProperty;
    if (/^(?:pt|pr|pb|pl|mt|mr|mb|ml|gap|w|h|min-w|max-w|min-h|max-h|top|right|bottom|left|grid-cols|grid-rows|rounded)-/.test(utility.replace(/^-/, "")) && utility.replace(/^-/, "").startsWith(prefix + "-")) return property as UtilityProperty;
    if (property === "fontSize" && /^text-\[(?:length:|\d|calc\(|clamp\(|var\(--text)/.test(utility)) return "fontSize";
    if (property === "fontSize" && /^text-(?:xs|sm|base|lg|xl|\d+xl)$/.test(utility)) return "fontSize";
    if (property === "fontWeight" && /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\d|\[(?!family-name:|family:))/.test(utility)) return "fontWeight";
    if (property === "backgroundColor" && utility.startsWith("bg-") && !/^bg-(?:none$|(?:linear|radial|conic|gradient|clip|origin|repeat)-|(?:cover|contain|auto|fixed|local|scroll|center|top|bottom|left|right)$|\[(?:image|url|length|position):)/.test(utility)) return "backgroundColor";
    if (property === "color" && (/^text-\[(?:color:|#)/.test(utility) || /^text-(?!\[|(?:left|right|center|justify|start|end|ellipsis|clip|wrap|nowrap|balance|pretty)$)/.test(utility))) return "color";
  }
  return null;
}
export function utilityScope(value: string): string {
  let depth = 0, boundary = -1;
  for (let index = 0; index < value.length; index++) {
    if (value[index] === "[") depth++;
    else if (value[index] === "]") depth--;
    else if (value[index] === ":" && depth === 0) boundary = index;
  }
  return value.slice(0, boundary + 1);
}
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
  if (!Array.isArray(entry.utilities) || entry.utilities.length > 100) throw new Error("Choose at most 100 Tailwind utilities.");
  entry.utilities.forEach(validateUtility);
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
  const doc = object(input, "Design"); keys(doc, ["version", "elements", "components", "instances", "customCss", "additions"], "Design");
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
  if (doc.additions !== undefined) next.additions = validateAdditions(doc.additions);
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
  const properties = new Set((change?.utilities ?? []).flatMap(utility => {
    const property = utilityProperty(utility);
    return property ? [utilityScope(utility) + property] : [];
  }));
  const inherited = base.split(/\s+/).filter(utility => {
    const property = utilityProperty(utility);
    return !property || !properties.has(utilityScope(utility) + property);
  });
  return cn(...inherited, ...(change?.utilities ?? []), ...(change?.customClasses ?? []));
}
export function setUtility(change: StyleChange, property: UtilityProperty, breakpoint: Breakpoint, utility: string): StyleChange {
  const prefix = breakpoint === "base" ? "" : `${breakpoint}:`;
  const remaining = change.utilities.filter(c => !(utilityScope(c) === prefix && utilityProperty(c) === property));
  return { ...change, utilities: utility ? cn(...remaining, prefix+utility).split(/\s+/).filter(Boolean) : remaining };
}
