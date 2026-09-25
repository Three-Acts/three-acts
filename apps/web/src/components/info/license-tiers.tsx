import type { Product } from "@three-acts/ecommerce";
import { Grid } from "../layout/grid";
import { Stat } from "../ui/stat";
import { formatMoney } from "../../lib/format";

type LicenseTiersProps = {
  licenses: Product[];
};

/** The 3-up price grid at the top of `/licenses` — one `Stat.Root` per licence tier, read straight from the shop catalogue. Static, server-rendered only, no `client:*` needed. */
export function LicenseTiers({ licenses }: LicenseTiersProps) {
  if (licenses.length === 0) {
    return null;
  }

  return (
    <Grid.Root cols={3} as="dl" className="mb-12 desktop:mb-16">
      {licenses.map((license) => (
        <Stat.Root
          key={license.slug}
          value={formatMoney(license.price, license.currency)}
          label={license.title}
          description={license.shortDescription}
        />
      ))}
    </Grid.Root>
  );
}

export default LicenseTiers;
