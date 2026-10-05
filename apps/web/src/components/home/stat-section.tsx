import copy from "@three-acts/static-content/documents/home.json";
import { Grid } from "../layout/grid";
import { Section } from "../layout/section";
import { Stat } from "../ui/stat";

const STATS = copy.stat_section.stats_1;

/** The trust-metric stat row directly under the hero, Thinkwise-style. */
export function StatSection() {
  return (
    <Section.Root className="pt-0 landscape:pt-0">
      <Section.Container>
        <Grid.Root cols={4} as="dl">
          {STATS.map((stat) => (
            <Stat.Root key={stat.label} value={stat.value} label={stat.label} description={stat.description} />
          ))}
        </Grid.Root>
      </Section.Container>
    </Section.Root>
  );
}
