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
          Build your next client site on Three Acts.
        </p>
        <div className="mt-8">
          <Button.Link href="/shop" variant="inverse" size="lg">
            Shop the template
          </Button.Link>
        </div>
      </Section.Container>
    </section>
  );
}
