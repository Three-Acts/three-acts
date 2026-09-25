import { Grid } from "../layout/grid";
import { Section } from "../layout/section";
import { Stat } from "../ui/stat";

const STATS = [
  { value: "1", label: "Repo to fork", description: "The Astro site, the CMS and the API bridge, versioned together." },
  { value: "<1 day", label: "Time to first deploy", description: "Configure the registry, connect a database, ship." },
  { value: "100%", label: "Static by default", description: "Every route pre-rendered; islands hydrate only what's interactive." },
  { value: "0", label: "Vendor lock-in", description: "Swap the backend, keep the site." }
];

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
