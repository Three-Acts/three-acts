import { elementClass } from "../../lib/design";
import copy from "@three-acts/static-content/documents/home.json";
import type { Testimonial } from "@three-acts/content";
import { Grid } from "../layout/grid";
import { Section } from "../layout/section";
import { Card } from "../ui/card";

type TestimonialsSectionProps = {
  /** Already selected by the caller — featured testimonials, 3–4. */
  testimonials: Testimonial[];
};

/** Quotes from the agencies shipping client sites on Three Acts. */
export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  if (testimonials.length === 0) {
    return null;
  }

  return (
    <Section.Root data-editor-id="source.testimonials-section.1">
      <Section.Container data-editor-id="source.testimonials-section.2">
        <Section.Header align="center" eyebrow={<span data-editor-base-class={""} data-editor-id="home.testimonials_section.eyebrow_1" className={elementClass("home.testimonials_section.eyebrow_1", "")} data-static-field="home.testimonials_section.eyebrow_1">{copy.testimonials_section.eyebrow_1}</span>} title={<span data-editor-base-class={""} data-editor-id="home.testimonials_section.title_2" className={elementClass("home.testimonials_section.title_2", "")} data-static-field="home.testimonials_section.title_2">{copy.testimonials_section.title_2}</span>} />
        <Grid.Root data-editor-id="source.testimonials-section.3" cols={testimonials.length >= 4 ? 4 : 3}>
          {testimonials.map((testimonial) => (
            <Card.Testimonial
              key={testimonial.id}
              quote={testimonial.quote}
              customerName={testimonial.customerName}
              customerTitle={testimonial.customerTitle}
              company={testimonial.company}
              avatar={testimonial.avatar}
              rating={testimonial.rating}
            />
          ))}
        </Grid.Root>
      </Section.Container>
    </Section.Root>
  );
}
