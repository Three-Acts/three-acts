import { Image } from "../ui/image";
import { Stat } from "../ui/stat";
import { Typography } from "../ui/typography";
import { Button } from "../ui/button";

type HeroSectionProps = {
  /** `loadProducts().length` — every live (non-discontinued) product. */
  productCount: number;
  /** Distinct single-origin coffees currently in the shop. */
  originCount: number;
  coverImage: { src: string; alt: string };
};

/**
 * The home page's opening section: display headline, lede, primary CTAs and a
 * trust-metric stat row over a large cover photo. Not wrapped in Section.Root
 * — it owns its own `min-h-hero` layout so the photo can run the full first
 * viewport.
 */
export function HeroSection({ productCount, originCount, coverImage }: HeroSectionProps) {
  return (
    <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pb-14 pt-6 min-h-hero tablet:grid-cols-hero">
      <div>
        <Typography.Eyebrow className="mb-5">Roasted in Observatory, Cape Town</Typography.Eyebrow>
        <Typography.Display>Coffee worth waking up for.</Typography.Display>
        <Typography.Lede className="mt-6">
          Small-batch single origins and house blends, roasted to order in our Observatory roastery and shipped fresh
          across South Africa — plus the gear to brew them properly at home.
        </Typography.Lede>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button.Link href="/shop" size="lg">
            Shop coffee
          </Button.Link>
          <Button.Link href="/blog" variant="secondary" size="lg">
            Read the journal
          </Button.Link>
        </div>
        <dl className="mt-10 grid gap-4 portrait:grid-cols-3">
          <Stat.Root value="2019" label="roasting since" />
          <Stat.Root value={String(productCount)} label="coffees & gear, live in the shop" />
          <Stat.Root value={String(originCount)} label="single origins on rotation" />
        </dl>
      </div>
      <div className="relative min-h-115 overflow-hidden border border-line bg-ink p-6 text-paper">
        <Image
          src={coverImage.src}
          alt={coverImage.alt}
          width={1200}
          height={1400}
          className="absolute inset-0 size-full object-cover opacity-80"
          loading="eager"
        />
        <div className="relative flex h-full flex-col justify-end">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-paper/70">Fynbos &amp; Fire Roastery</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight font-serif">14 Lower Main Road, Observatory</p>
        </div>
      </div>
    </div>
  );
}
