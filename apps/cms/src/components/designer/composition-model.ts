import { defaultSectionId, homeSections, sectionElementId, type HomeSectionType } from "@three-acts/static-content";
import { validateDesign, type DesignDocument } from "@three-acts/design";

/** Copy authored instance styles/variants; component definitions and reusable
 * class CSS stay shared. The source instance is never mutated. */
export function copySectionDesign(design: DesignDocument, type: HomeSectionType, sourceId: string, targetId: string): DesignDocument {
  const next = structuredClone(design);
  const definition = homeSections[type];
  const sourcePrefix = sourceId === defaultSectionId(type) ? "" : `composition.${sourceId}.`;
  function target(id: string): string | null {
    if (id === `layout.section.${sourceId}`) return `layout.section.${targetId}`;
    if (!id.startsWith(sourcePrefix)) return null;
    const base = id.slice(sourcePrefix.length);
    if (!base.startsWith(`source.${definition.source}.`) && !base.startsWith(`home.${definition.group}.`) && !(type === "hero" && base === "home.hero")) return null;
    return sectionElementId(targetId, type, base);
  }
  for (const [id, style] of Object.entries(design.elements)) { const copied = target(id); if (copied) next.elements[copied] = structuredClone(style); }
  for (const [id, props] of Object.entries(design.instances)) { const copied = target(id); if (copied) next.instances[copied] = structuredClone(props); }
  return validateDesign(next);
}
