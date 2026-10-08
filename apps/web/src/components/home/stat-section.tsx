import { elementClass } from "../../lib/design";
import { defaultSectionScope, type HomeSectionScopeProps } from "./section-scope";
import { Grid } from "../layout/grid";
import { Section } from "../layout/section";
import { Stat } from "../ui/stat";


/** The trust-metric stat row directly under the hero, Thinkwise-style. */
export function StatSection({ composition }: HomeSectionScopeProps = {}) {
  const { copy, id, field } = composition ?? defaultSectionScope;
  const STATS = copy.stat_section.stats_1;
  return (
    <Section.Root data-editor-id={id("source.stat-section.1")} className="pt-0 landscape:pt-0">
      <Section.Container data-editor-id={id("source.stat-section.2")}>
        <Grid.Root data-editor-id={id("source.stat-section.3")} cols={4} as="dl">
          {STATS.map((stat, index) => (
            <Stat.Root key={index}
              value={<span data-editor-base-class="" data-editor-id={id(`home.stat_section.stats_1.${index}.value`)} className={elementClass(id(`home.stat_section.stats_1.${index}.value`), "")} data-static-field={field(`home.stat_section.stats_1.${index}.value`)}>{stat.value}</span>}
              label={<span data-editor-base-class="" data-editor-id={id(`home.stat_section.stats_1.${index}.label`)} className={elementClass(id(`home.stat_section.stats_1.${index}.label`), "")} data-static-field={field(`home.stat_section.stats_1.${index}.label`)}>{stat.label}</span>}
              description={<span data-editor-base-class="" data-editor-id={id(`home.stat_section.stats_1.${index}.description`)} className={elementClass(id(`home.stat_section.stats_1.${index}.description`), "")} data-static-field={field(`home.stat_section.stats_1.${index}.description`)}>{stat.description}</span>}/>
          ))}
        </Grid.Root>
      </Section.Container>
    </Section.Root>
  );
}
