import copy from "@three-acts/static-content/documents/home.json";
import { Button } from "../ui/button";
import { Section } from "../layout/section";

/**
 * The closing full-bleed black CTA band: a centred display line and one
 * inverse button through to the shop. `py-[200px]` is a fixed, non-responsive
 * measurement per the reference — deliberately not `Section.Root` (whose
 * `py-section` rhythm would otherwise win on landscape+ viewports).
 */
export function CtaSection() {
  return (
    <section className="bg-ink py-[200px] text-surface">
      <Section.Container className="text-center">
        <p className="mx-auto max-w-[660px] text-display font-normal text-surface">
          <span data-static-field="home.cta_section.p_1">{copy.cta_section.p_1}</span></p>
        <div className="mt-8">
          <Button.Link data-static-field="home.cta_section.href_2" data-static-attribute="href" href={copy.cta_section.href_2} variant="inverse" size="lg">
            <span data-static-field="home.cta_section.link_3">{copy.cta_section.link_3}</span></Button.Link>
        </div>
      </Section.Container>
    </section>
  );
}
