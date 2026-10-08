import home from "./documents/home.json";
import { checkContentShape } from "./value-validation";
import type { ContentObject } from "./index";

/** Approved composition is a source contract, never an arbitrary DOM tree. */
export const homeSections = {
  hero: { label: "Hero", group: "hero_section", source: "hero-section" },
  stats: { label: "Stats", group: "stat_section", source: "stat-section" },
  categories: { label: "Shop by category", group: "shop_by_category_section", source: "shop-by-category-section" },
  products: { label: "Featured products", group: "featured_products_section", source: "featured-products-section" },
  intro: { label: "Intro", group: "intro_section", source: "intro-section" },
  journal: { label: "Journal", group: "journal_section", source: "journal-section" },
  testimonials: { label: "Testimonials", group: "testimonials_section", source: "testimonials-section" },
  faq: { label: "FAQ teaser", group: "faq_teaser_section", source: "faq-teaser-section" },
  cta: { label: "CTA", group: "cta_section", source: "cta-section" },
} as const;
export type HomeSectionType = keyof typeof homeSections;
export const homeSectionFieldLabels: Record<HomeSectionType, Record<string, string>> = {
  hero: { display_1: "Headline", lede_2: "Description", href_3: "Button URL", link_4: "Button text" },
  stats: {}, categories: { eyebrow_1: "Eyebrow", title_2: "Heading" },
  products: { eyebrow_2: "Eyebrow", title_3: "Heading", lede_4: "Description", href_5: "Button URL", link_6: "Button text" },
  intro: { title_3: "Heading", p_4: "Description" },
  journal: { title_1: "Heading", h3_2: "Section label", p_3: "CTA text", href_4: "Button URL", link_5: "Button text" },
  testimonials: { eyebrow_1: "Eyebrow", title_2: "Heading" },
  faq: { eyebrow_1: "Eyebrow", title_2: "Heading", href_3: "Button URL", link_4: "Button text" },
  cta: { p_1: "Headline", href_2: "Button URL", link_3: "Button text" },
};
export type HomeCopy = typeof home;
export type LayoutSection = { type: HomeSectionType; hidden: boolean; content?: ContentObject };
export type PageLayout = { order: string[]; sections: Record<string, LayoutSection> };
export type LayoutDocument = { version: 1; pages: { home: PageLayout } };
export const layoutLimits = { sections: 60, bytes: 512 * 1024 } as const;
export const defaultSectionId = (type: HomeSectionType) => `home-${type}`;
export const isHomeSectionType = (value: unknown): value is HomeSectionType => typeof value === "string" && Object.hasOwn(homeSections, value);
export const isSectionId = (value: unknown): value is string => typeof value === "string" && /^(?:home-[a-z]+|section-[a-zA-Z0-9_-]{1,64})$/.test(value);
export type LayoutSource = { page: "home"; id: string; type: HomeSectionType; hidden: boolean };
export function layoutSources(layout: LayoutDocument): LayoutSource[] {
  return layout.pages.home.order.map(id => ({ page: "home", id, type: layout.pages.home.sections[id].type, hidden: layout.pages.home.sections[id].hidden }));
}
export function readLayoutSource(input: unknown): LayoutSource | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  return value.page === "home" && isSectionId(value.id) && isHomeSectionType(value.type) && typeof value.hidden === "boolean" ? { page: "home", id: value.id, type: value.type, hidden: value.hidden } : null;
}
export function defaultLayout(): LayoutDocument {
  const types = Object.keys(homeSections) as HomeSectionType[];
  return { version: 1, pages: { home: { order: types.map(defaultSectionId), sections: Object.fromEntries(types.map(type => [defaultSectionId(type), { type, hidden: false }])) } } };
}
function object(value: unknown, allowed: string[], path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key))) throw new Error(`${path}: unsupported layout fields.`);
  return value as Record<string, unknown>;
}
export function validateLayout(input: unknown): LayoutDocument {
  const doc = object(input, ["version", "pages"], "Layout");
  if (doc.version !== 1) throw new Error("Unsupported layout document version.");
  const pages = object(doc.pages, ["home"], "Layout pages");
  const page = object(pages.home, ["order", "sections"], "Home layout");
  if (!Array.isArray(page.order) || page.order.length < 1 || page.order.length > layoutLimits.sections || page.order.some(id => !isSectionId(id)) || new Set(page.order).size !== page.order.length) throw new Error(`Home layout: use 1–${layoutLimits.sections} distinct approved section identities.`);
  const order = page.order as string[];
  const raw = object(page.sections, order, "Home sections");
  if (Object.keys(raw).length !== order.length || order.some(id => !Object.hasOwn(raw, id))) throw new Error("Home layout: order and section identities must agree.");
  const sections: Record<string, LayoutSection> = {};
  for (const id of order) {
    const section = object(raw[id], ["type", "hidden", "content"], id);
    if (!isHomeSectionType(section.type) || typeof section.hidden !== "boolean") throw new Error(`${id}: choose an approved section type and visibility.`);
    const type = section.type;
    const original = id === defaultSectionId(type);
    if (id.startsWith("home-") && !original) throw new Error(`${id}: original section identity has a different type.`);
    if (!Object.hasOwn(section, "content") && !original) throw new Error(`${id}: inserted sections need their own source copy.`);
    sections[id] = { type, hidden: section.hidden, ...(Object.hasOwn(section, "content") ? { content: checkContentShape(home[homeSections[type].group], section.content, `${id}.content`) as ContentObject } : {}) };
  }
  const next: LayoutDocument = { version: 1, pages: { home: { order: [...order], sections } } };
  if (new TextEncoder().encode(JSON.stringify(next)).length > layoutLimits.bytes) throw new Error("Layout document exceeds 512 KiB.");
  return next;
}

export function sectionContent(section: LayoutSection, copy: HomeCopy): ContentObject {
  return section.content ?? copy[homeSections[section.type].group];
}
/** Default identities stay compatible with existing styles and bindings. */
export function sectionElementId(id: string, type: HomeSectionType, base: string): string {
  return id === defaultSectionId(type) ? base : `composition.${id}.${base}`;
}
export function sectionField(id: string, section: LayoutSection, path: string): string {
  const prefix = `home.${homeSections[section.type].group}.`;
  if (!path.startsWith(prefix)) throw new Error("Section copy is outside its approved source group.");
  return section.content ? `layout.pages.home.sections.${id}.content.${path.slice(prefix.length)}` : path;
}
export function insertSection(input: LayoutDocument, type: HomeSectionType, id: string, copy: HomeCopy, after?: string): LayoutDocument {
  const next = structuredClone(input);
  const page = next.pages.home;
  if (!isHomeSectionType(type) || !isSectionId(id) || Object.hasOwn(page.sections, id)) throw new Error("Choose a new approved section identity.");
  if (after && !Object.hasOwn(page.sections, after)) throw new Error("The insertion target no longer exists.");
  page.sections[id] = { type, hidden: false, content: structuredClone(copy[homeSections[type].group]) };
  page.order.splice(after ? page.order.indexOf(after) + 1 : page.order.length, 0, id);
  return validateLayout(next);
}
export function duplicateSection(input: LayoutDocument, sourceId: string, id: string, copy: HomeCopy): LayoutDocument {
  const source = input.pages.home.sections[sourceId];
  if (!source) throw new Error("The selected section no longer exists.");
  const next = insertSection(input, source.type, id, copy, sourceId);
  next.pages.home.sections[id] = { ...structuredClone(source), content: structuredClone(sectionContent(source, copy)) };
  return validateLayout(next);
}
export function moveSection(input: LayoutDocument, id: string, target: number): LayoutDocument {
  const next = structuredClone(input);
  const order = next.pages.home.order;
  const index = order.indexOf(id);
  if (index < 0 || !Number.isInteger(target) || target < 0 || target >= order.length) throw new Error("Choose an existing section position.");
  order.splice(index, 1); order.splice(target, 0, id);
  return validateLayout(next);
}
