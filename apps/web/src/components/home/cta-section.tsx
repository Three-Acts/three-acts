import { elementClass } from "../../lib/design";
import { defaultSectionScope, type HomeSectionScopeProps } from "./section-scope";
import { Button } from "../ui/button";
import { Section } from "../layout/section";

/**
 * The closing full-bleed black CTA band: a centred display line and one
 * inverse button through to the shop. `py-[200px]` is a fixed, non-responsive
 * measurement per the reference — deliberately not `Section.Root` (whose
 * `py-section` rhythm would otherwise win on landscape+ viewports).
 */
export function CtaSection({ composition }: HomeSectionScopeProps = {}) {
  const { copy, id, field } = composition ?? defaultSectionScope;
  return (
    <section data-editor-base-class={"bg-ink py-[200px] text-surface"} data-editor-id={id("source.cta-section.1")} className={elementClass(id("source.cta-section.1"), "bg-ink py-[200px] text-surface")}>
      <Section.Container data-editor-id={id("source.cta-section.2")} className="text-center">
        <p data-editor-base-class={"mx-auto max-w-[660px] text-display font-normal text-surface"} data-editor-id={id("source.cta-section.3")} className={elementClass(id("source.cta-section.3"), "mx-auto max-w-[660px] text-display font-normal text-surface")}>
          <span data-editor-base-class={""} data-editor-id={id("home.cta_section.p_1")} className={elementClass(id("home.cta_section.p_1"), "")} data-static-field={field("home.cta_section.p_1")}>{copy.cta_section.p_1}</span></p>
        <div data-editor-base-class={"mt-8"} data-editor-id={id("source.cta-section.4")} className={elementClass(id("source.cta-section.4"), "mt-8")}>
          <Button.Link data-editor-id={id("home.cta_section.href_2")} data-static-field={field("home.cta_section.href_2")} data-static-attribute="href" href={copy.cta_section.href_2} variant="inverse" size="lg">
            <span data-editor-base-class={""} data-editor-id={id("home.cta_section.link_3")} className={elementClass(id("home.cta_section.link_3"), "")} data-static-field={field("home.cta_section.link_3")}>{copy.cta_section.link_3}</span></Button.Link>
        </div>
      </Section.Container>
    </section>
  );
}
