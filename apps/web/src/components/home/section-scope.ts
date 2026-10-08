import { homeSections, sectionContent, sectionElementId, sectionField, type HomeCopy, type LayoutSection } from "@three-acts/static-content";
import sourceCopy from "@three-acts/static-content/documents/home.json";

export type HomeSectionScope = {
  copy: HomeCopy;
  id: (base: string) => string;
  field: (path: string) => string;
  primaryHeading: boolean;
};
export type HomeSectionScopeProps = { composition?: HomeSectionScope };
export const defaultSectionScope: HomeSectionScope = { copy: sourceCopy, id: value => value, field: value => value, primaryHeading: true };
export function homeSectionScope(id: string, section: LayoutSection, copy: HomeCopy, primaryHeading: boolean): HomeSectionScope {
  return {
    copy: { ...copy, [homeSections[section.type].group]: sectionContent(section, copy) } as HomeCopy,
    id: base => sectionElementId(id, section.type, base),
    field: path => sectionField(id, section, path),
    primaryHeading,
  };
}
