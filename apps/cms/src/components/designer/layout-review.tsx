import { contentFields, homeSections, homeSectionFieldLabels, sectionContent, validateLayout, type HomeCopy } from "@three-acts/static-content";
import type { Draft } from "./drafts";
import { fieldLabel } from "./drafts";

export function LayoutReview({ draft, home }: { draft: Draft; home: HomeCopy }) {
  const before = validateLayout(draft.original).pages.home;
  const after = validateLayout(draft.content).pages.home;
  const ids = [...new Set([...after.order, ...before.order])];
  return <section className="overflow-hidden rounded-cms border border-cms-line-strong bg-cms-surface">
    <h3 className="m-0 border-b border-cms-line px-2.5 py-2 text-ui font-medium">Page composition · Home</h3>
    <div className="divide-y divide-cms-line">{ids.map(id => {
      const source = before.sections[id]; const section = after.sections[id];
      const previousPosition = before.order.indexOf(id); const position = after.order.indexOf(id);
      const oldFields = new Map(contentFields(source ? sectionContent(source, home) : home[homeSections[section.type].group]).map(field => [field.path.join("."), field.value]));
      const fields = section ? contentFields(sectionContent(section, home)).filter(field => field.value !== oldFields.get(field.path.join("."))) : [];
      if (source && section && previousPosition === position && source.hidden === section.hidden && Boolean(source.content) === Boolean(section.content) && !fields.length) return null;
      const label = homeSections[(section ?? source).type].label;
      return <div key={id} className="grid gap-1.5 px-2.5 py-2 text-ui">
        <strong className="font-medium">{!source ? `Inserted ${label}` : !section ? `Removed ${label}` : label}</strong>
        <p className="m-0 text-cms-subtle">{!source ? `Position ${position + 1}` : !section ? `Was position ${previousPosition + 1}` : previousPosition !== position ? `Position ${previousPosition + 1} → ${position + 1}` : `Position ${position + 1}`}{section && ` · ${section.hidden ? "Hidden" : "Visible"}`}{section?.content && " · Independent copy"}</p>
        {fields.map(field => <div key={field.path.join(".")} className="grid gap-1">
          <small className="text-cms-subtle">{homeSectionFieldLabels[section!.type][field.path.join(".")] ?? fieldLabel(field.path)}</small>
          <del className="whitespace-pre-wrap wrap-break-word rounded-cms bg-cms-bg px-2 py-1 text-cms-subtle">{String(oldFields.get(field.path.join("."))) || "Empty"}</del>
          <ins className="whitespace-pre-wrap wrap-break-word rounded-cms border border-cms-success/30 bg-cms-success/10 px-2 py-1 text-cms-text no-underline">{String(field.value) || "Empty"}</ins>
        </div>)}
      </div>;
    })}</div>
  </section>;
}
