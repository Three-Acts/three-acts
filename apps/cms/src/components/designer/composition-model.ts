import type { SourceEdit } from "@three-acts/editor-source";
import {
  defaultSectionId,
  homeSections,
  sectionElementId,
  type HomeSectionType,
} from "@three-acts/static-content";
import {
  applyStyle,
  validateDesign,
  type DesignDocument,
} from "@three-acts/design";

export function copiedSectionTarget(
  type: HomeSectionType,
  sourceId: string,
  targetId: string,
  id: string,
): string | null {
  const definition = homeSections[type];
  const sourcePrefix =
    sourceId === defaultSectionId(type) ? "" : `composition.${sourceId}.`;

  if (id === `layout.section.${sourceId}`) return `layout.section.${targetId}`;
  if (!id.startsWith(sourcePrefix)) return null;
  const base = id.slice(sourcePrefix.length);
  if (
    !base.startsWith(`source.${definition.source}.`) &&
    !base.startsWith(`home.${definition.group}.`) &&
    !(type === "hero" && base === "home.hero")
  )
    return null;
  return sectionElementId(targetId, type, base);
}
/** Copy authored instance styles/variants; component definitions and reusable
 * class CSS stay shared. The source instance is never mutated. */
export function copySectionDesign(
  design: DesignDocument,
  type: HomeSectionType,
  sourceId: string,
  targetId: string,
): DesignDocument {
  const next = structuredClone(design);
  for (const [id, style] of Object.entries(design.elements)) {
    const copied = copiedSectionTarget(type, sourceId, targetId, id);
    if (copied) next.elements[copied] = structuredClone(style);
  }
  for (const [id, props] of Object.entries(design.instances)) {
    const copied = copiedSectionTarget(type, sourceId, targetId, id);
    if (copied) next.instances[copied] = structuredClone(props);
  }
  return validateDesign(next);
}

export function copiedSectionSourceEdits(
  type: HomeSectionType,
  sourceId: string,
  targetId: string,
  baseline: SourceEdit[],
  drafts: SourceEdit[],
): SourceEdit[] {
  const candidates = new Map(
    baseline.map((edit) => [`${edit.start}:${edit.target}`, edit]),
  );
  for (const edit of drafts) {
    const key = `${edit.start}:${edit.target}`,
      original = candidates.get(key);
    candidates.set(
      key,
      original
        ? {
            ...edit,
            style: {
              utilities: applyStyle(original.style.utilities.join(" "), {
                ...edit.style,
                customClasses: [],
              })
                .split(/\s+/)
                .filter(Boolean),
              customClasses: [
                ...new Set([
                  ...original.style.customClasses,
                  ...edit.style.customClasses,
                ]),
              ],
            },
          }
        : edit,
    );
  }
  return [...candidates.values()].flatMap((edit) => {
    const target = copiedSectionTarget(type, sourceId, targetId, edit.target);
    return target ? [{ ...edit, target }] : [];
  });
}
