import type { CmsRecord, CmsRecordValue, PublishStatus } from "../types";
import { serializeImageValue } from "../images";
import { articleCategorySlugs, authorSlugs, productSlugs, seedBrand } from "./keys";
import { createRandom, daysAgo, seedRecord, type SeedCollections } from "./types";

/**
 * Content seed for Fynbos & Fire's brewing journal: authors, article
 * categories, ~40 articles and the FAQ page. Fully deterministic — dates come
 * from `daysAgo`, variation from `createRandom`.
 */

type AuthorSlug = (typeof authorSlugs)[number];
type CategorySlug = (typeof articleCategorySlugs)[number];
type ProductSlug = (typeof productSlugs)[number];
type Values = Record<string, CmsRecordValue>;

const emailDomain = seedBrand.domain;

/** A shop link as it appears in article bodies. Typed so only shared product slugs compile. */
function shopLink(slug: ProductSlug): string {
  return `/shop/${slug}`;
}

/** Words per minute used for `readingTime`. The content test checks bodies against this. */
export const READING_WORDS_PER_MINUTE = 220;

export function estimateReadingTime(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / READING_WORDS_PER_MINUTE));
}

function paragraphs(...items: string[]): string {
  return items.map((item) => item.trim()).join("\n\n");
}

function coverImage(slug: string, alt: string): string {
  return serializeImageValue({
    src: `https://picsum.photos/seed/${slug}/1600/900`,
    fileName: `${slug}-cover.jpg`,
    width: 1600,
    height: 900,
    alt
  });
}

// --- Authors -----------------------------------------------------------------

type AuthorSpec = {
  slug: AuthorSlug;
  name: string;
  role: string;
  bio: string;
  email: string;
  websiteUrl?: string;
  xHandle?: string;
  instagramHandle?: string;
  linkedinUrl?: string;
  createdDays: number;
  modifiedDays: number;
  status?: PublishStatus;
};

const authorSpecs: AuthorSpec[] = [
  {
    slug: "lindiwe-khumalo",
    name: "Lindiwe Khumalo",
    role: "Co-founder & Head Roaster",
    bio: "Lindiwe started Fynbos & Fire on a 1 kg sample roaster in a Salt River garage in 2019. She now runs the roasting programme in Woodstock and still cups every production batch before it ships. When she is not at the roaster she is probably hiking Lion's Head with a flask of whatever she roasted yesterday.",
    email: `lindiwe@${emailDomain}`,
    instagramHandle: "@lindiwe.roasts",
    linkedinUrl: "https://www.linkedin.com/in/lindiwe-khumalo-coffee",
    createdDays: 610,
    modifiedDays: 40
  },
  {
    slug: "pieter-van-wyk",
    name: "Pieter van Wyk",
    role: "Green Coffee Buyer & Q Grader",
    bio: "Pieter is a licensed Q Arabica Grader who spent six years buying for an importer in Durban before joining us. He spends roughly three months a year at origin, mostly in East Africa, and writes our origin reports from notebooks that are usually damp with coffee cherry.",
    email: `pieter@${emailDomain}`,
    xHandle: "@pietervwcoffee",
    linkedinUrl: "https://www.linkedin.com/in/pietervanwyk",
    createdDays: 608,
    modifiedDays: 120
  },
  {
    slug: "ama-mensah",
    name: "Ama Mensah",
    role: "Head of Education & Barista Trainer",
    bio: "Ama is an SCA Authorized Specialty Coffee Trainer who grew up between Accra and Johannesburg. She runs our home-brewing workshops and wholesale barista training, and she believes most bad coffee is a grind-size problem wearing a disguise.",
    email: `ama@${emailDomain}`,
    instagramHandle: "@ama.brews",
    xHandle: "@amamensah",
    createdDays: 590,
    modifiedDays: 15
  },
  {
    slug: "jordan-le-roux",
    name: "Jordan le Roux",
    role: "Editor",
    bio: "Jordan edits the Fynbos & Fire journal and tests more grinders than is strictly healthy. Before coffee they were a features writer at a Cape Town food magazine. Jordan has opinions about burr alignment and would love to share them with you.",
    email: `jordan@${emailDomain}`,
    websiteUrl: "https://jordanleroux.co.za",
    xHandle: "@jordanleroux",
    instagramHandle: "@jordan.writes.coffee",
    linkedinUrl: "https://www.linkedin.com/in/jordan-le-roux",
    createdDays: 560,
    modifiedDays: 8
  },
  {
    slug: "zanele-ndlovu",
    name: "Zanele Ndlovu",
    role: "Sustainability & Impact Lead",
    bio: "Zanele looks after our direct-trade relationships, packaging and the yearly transparency report. She trained as an environmental scientist at UCT and still gets visibly excited about compost temperatures.",
    email: `zanele@${emailDomain}`,
    linkedinUrl: "https://www.linkedin.com/in/zanele-ndlovu-impact",
    createdDays: 500,
    modifiedDays: 30
  },
  {
    slug: "marco-ferreira",
    name: "Marco Ferreira",
    role: "Guest Contributor",
    bio: "Marco is a Maputo-born photographer and writer based in Bogotá, where he documents smallholder coffee farms across Huila and Nariño. He travels with Pieter on our Colombian buying trips and contributes photo essays to the journal.",
    email: "marco@marcoferreira.photo",
    websiteUrl: "https://marcoferreira.photo",
    instagramHandle: "@marco.ferreira.photo",
    createdDays: 420,
    modifiedDays: 200
  },
  {
    slug: "fatima-patel",
    name: "Fatima Patel",
    role: "Wholesale & Café Partnerships Manager",
    bio: "Fatima looks after the 60-odd cafés, offices and restaurants that pour our coffee, from Sea Point to Stellenbosch. She has pulled shots behind more La Marzoccos than she can count and writes about recipes that actually work in a busy service.",
    email: `fatima@${emailDomain}`,
    linkedinUrl: "https://www.linkedin.com/in/fatimapatel-coffee",
    createdDays: 380,
    modifiedDays: 60
  },
  {
    slug: "sam-okafor",
    name: "Sam Okafor",
    role: "Guest Contributor",
    bio: "Sam is a Lagos-born software engineer and home-espresso obsessive living in Observatory. He is writing his first guest piece for the journal.",
    email: "sam.okafor@proton.me",
    createdDays: 12,
    modifiedDays: 3,
    status: "draft"
  }
];

const authorRecords: CmsRecord[] = authorSpecs.map((spec) =>
  seedRecord({
    id: `author-${spec.slug}`,
    publishStatus: spec.status ?? "published",
    createdAt: daysAgo(spec.createdDays),
    modifiedAt: daysAgo(spec.modifiedDays),
    values: {
      name: spec.name,
      slug: spec.slug,
      role: spec.role,
      bio: spec.bio,
      avatar: serializeImageValue({
        src: `https://picsum.photos/seed/${spec.slug}/400/400`,
        fileName: `${spec.slug}.jpg`,
        width: 400,
        height: 400,
        alt: `Portrait of ${spec.name}`
      }),
      email: spec.email,
      websiteUrl: spec.websiteUrl ?? "",
      xHandle: spec.xHandle ?? "",
      instagramHandle: spec.instagramHandle ?? "",
      linkedinUrl: spec.linkedinUrl ?? ""
    }
  })
);

// --- Article categories ------------------------------------------------------

const categorySpecs: Array<{ slug: CategorySlug; name: string; description: string }> = [
  {
    slug: "brew-guides",
    name: "Brew Guides",
    description:
      "Step-by-step recipes for pour-over, AeroPress, French press and espresso, tested on our training bar in Woodstock. Ratios, grind settings and the mistakes we made so you don't have to."
  },
  {
    slug: "origins",
    name: "Origins",
    description:
      "Field notes from the farms, washing stations and cooperatives we buy from in Ethiopia, Kenya, Rwanda, Colombia and Brazil — who grows our coffee, how it is processed and what it costs."
  },
  {
    slug: "gear-reviews",
    name: "Gear Reviews",
    description:
      "Long-term, honest reviews of grinders, brewers, kettles and scales. We only review gear we have used daily for at least a month, and we say so when we sell it."
  },
  {
    slug: "recipes",
    name: "Recipes",
    description: "Iced coffee, cold brew, espresso drinks and the occasional dessert. Coffee recipes for hot Cape Town summers and slow winter weekends."
  },
  {
    slug: "roastery-news",
    name: "Roastery News",
    description: "New arrivals, events, opening hours and behind-the-scenes updates from the Fynbos & Fire roastery in Woodstock, Cape Town."
  },
  {
    slug: "sustainability",
    name: "Sustainability",
    description:
      "How we buy, pack and ship coffee more responsibly: direct-trade pricing, our yearly transparency report, compostable packaging and the numbers behind them."
  }
];

const categoryRecords: CmsRecord[] = categorySpecs.map((spec, index) => {
  const values: Values = { name: spec.name, slug: spec.slug, description: spec.description, sortOrder: (index + 1) * 10 };
  if (spec.slug === "sustainability") {
    // Description rewrite in progress; the live site still shows the old copy.
    return seedRecord({
      id: `article-category-${spec.slug}`,
      publishStatus: "draft",
      createdAt: daysAgo(600),
      modifiedAt: daysAgo(4),
      values,
      liveValues: { ...values, description: "How we try to buy, roast and ship coffee in a way we can be proud of." }
    });
  }
  return seedRecord({ id: `article-category-${spec.slug}`, createdAt: daysAgo(600 - index), modifiedAt: daysAgo(300 - index * 20), values });
});

// --- Articles ----------------------------------------------------------------

type ArticleSpec = {
  key: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  author: AuthorSlug;
  category: CategorySlug | "";
  tags: string;
  /** Days before seedNow the article is dated (negative = scheduled). */
  publishedDays: number;
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  /** Cover alt text; `null` = no cover image. */
  coverAlt: string | null;
  status?: PublishStatus;
  /** For drafts/queued edits of published articles: overrides that rebuild the older live snapshot. */
  liveOverrides?: Values;
  /** Days before seedNow of the last edit (defaults to shortly after publishing). */
  modifiedDays?: number;
};

function articleRecord(spec: ArticleSpec): CmsRecord {
  const values: Values = {
    title: spec.title,
    slug: spec.slug,
    excerpt: spec.excerpt,
    body: spec.body,
    coverImage: spec.coverAlt === null ? "" : coverImage(spec.slug, spec.coverAlt),
    author: spec.author,
    category: spec.category,
    tags: spec.tags,
    publishedAt: daysAgo(spec.publishedDays),
    readingTime: estimateReadingTime(spec.body),
    featured: spec.featured ?? false,
    seoTitle: spec.seoTitle ?? "",
    seoDescription: spec.seoDescription ?? ""
  };
  let liveValues: Values | null | undefined;
  if (spec.liveOverrides) {
    liveValues = { ...values, ...spec.liveOverrides };
    if (typeof liveValues.body === "string") {
      liveValues.readingTime = estimateReadingTime(liveValues.body);
    }
  }
  const createdDays = Math.max(spec.publishedDays, 0) + 4;
  const modifiedDays = spec.modifiedDays ?? Math.max(spec.publishedDays - 1, 0);
  return seedRecord({
    id: `article-${spec.key}`,
    publishStatus: spec.status ?? "published",
    createdAt: daysAgo(createdDays, 2),
    modifiedAt: daysAgo(Math.min(modifiedDays, createdDays)),
    values,
    liveValues
  });
}

const v60BodyLive = paragraphs(
  `The V60 is the brewer we reach for most at the roastery. It is cheap, it is fast and it rewards a little attention. Here is the recipe we teach in our home-brewing workshops.`,
  `Use 15 g of coffee to 250 g of water just off the boil, around 94 °C. Grind medium-fine, roughly the texture of table salt. Rinse the paper filter with hot water first to get rid of any papery taste and to warm the dripper.`,
  `Bloom with 45 g of water and give the slurry a gentle swirl. After 40 seconds, pour slowly in spirals up to 150 g, pause, then continue to 250 g. Aim to finish draining at around three minutes.`,
  `If it tastes sour, grind finer. If it tastes bitter or dry, grind coarser. Change one thing at a time.`
);

const v60Body = paragraphs(
  `The V60 is the brewer we reach for most at the roastery. It is cheap, it is fast, and it rewards exactly as much attention as you are willing to give it. This is the recipe we teach in our Saturday home-brewing workshops, refined over roughly four thousand cups on the training bar.`,
  `You will need a V60 (our ${shopLink("v60-ceramic-dripper")} holds heat better than plastic, but plastic brews just as well), a paper filter, a kettle — ideally a gooseneck such as the ${shopLink("gooseneck-kettle-900ml")} — and a scale. Volume scoops are the single biggest source of inconsistency we see in people's home brewing, so if you only buy one thing this year, make it a scale.`,
  `Start with 15 g of coffee and 250 g of water, a ratio of about 1:16.7. Heat the water to between 92 °C and 96 °C; if you don't have a thermometer, let a boiled kettle rest for thirty seconds. Grind medium-fine, somewhere between table salt and caster sugar. On a Comandante that is around 22 clicks; on a Baratza Encore ESP, start at 14.`,
  `Rinse the filter thoroughly with hot water. This washes out paper flavour and preheats the dripper and your cup. Discard the rinse water, add your coffee, and shake the dripper gently to level the bed.`,
  `Start your timer and pour 45 g of water — three times the coffee weight — making sure every ground is wet. Give the dripper one gentle swirl. This is the bloom: fresh coffee releases carbon dioxide, and letting it escape for 40 seconds means the rest of the water can extract evenly instead of being pushed away by gas.`,
  `At 0:40, pour in slow, steady spirals up to 150 g, keeping the stream in the middle two-thirds of the bed and avoiding the paper walls. Let it drop for about ten seconds, then pour again to 250 g by roughly 1:45. Finish with a single gentle swirl so the bed settles flat.`,
  `The brew should finish draining between 2:45 and 3:30. Much faster, and your cup will likely be thin and sour — grind finer. Much slower, and it will taste bitter, drying or muddy — grind coarser. A flat bed at the end is a good sign; a crater or a wall of grounds high on the paper suggests your pour was too aggressive.`,
  `Taste as it cools. Our washed Ethiopians, like the ${shopLink("ethiopia-yirgacheffe-kochere")}, open up enormously between 60 °C and 45 °C, and you will often find jasmine and bergamot that were hiding when it was hot. Adjust one variable at a time, write it down, and within a week you will have a recipe that is genuinely yours.`
);

const kenyaBodyLive = paragraphs(
  `We visited the Gatomboya factory in Nyeri in March, just after the long rains began. The cherries were ripening unevenly and the farmers were picking in several passes.`,
  `This year's AA lot cupped at 88 points on our table, with blackcurrant, grapefruit and a tomato-leaf savouriness that we love in Nyeri coffees. It is available now in 250 g and 1 kg bags.`,
  `We paid well above the cooperative's auction average for this lot and will publish the full figures in our transparency report.`
);

const kenyaBody = paragraphs(
  `We arrived at the Gatomboya factory in Nyeri county in the second week of March, a few days after the long rains had broken. The red volcanic soil was slick, the Aberdare foothills were wrapped in cloud most mornings, and the factory manager, Mr Wachira, warned us that picking had become a patchwork: cherries on the same tree were ripening days apart.`,
  `Gatomboya is one of several factories — Kenya's word for a washing station — owned by a farmers' cooperative society of roughly 1,200 members. Most members farm fewer than 250 trees each, largely SL28 and SL34, with some Ruiru 11 and Batian planted after the coffee berry disease outbreaks of the last decade. Cherry is delivered by hand each afternoon, sorted on tarpaulins, pulped, and fermented in concrete tanks before being washed, soaked and dried on raised beds for up to three weeks.`,
  `That long soak and slow drying are a big part of why Nyeri coffees taste the way they do. On our cupping table in Woodstock the AA lot scored 88.25, with blackcurrant, pink grapefruit, cane sugar and that faintly savoury tomato-leaf note that makes Kenyan coffee so unmistakable. As a filter roast it is juicy and structured; as espresso it is a lot, in the best way.`,
  `We bought the lot through the cooperative's marketing agent rather than at the Nairobi auction, which lets us agree the price before the coffee is milled. We paid USD 9.10 per kilogram FOB for this lot, about 38% above the society's average auction price for the season. Zanele will break the figures down in our transparency report later this year.`,
  `The ${shopLink("kenya-nyeri-gatomboya")} is available now in 250 g and 1 kg bags. We recommend brewing it a touch coarser than you would an Ethiopian, and giving it a week off roast before you open the bag.`
);

const flagshipArticles: ArticleSpec[] = [
  {
    key: "v60-guide",
    slug: "v60-brew-guide",
    title: "The Fynbos & Fire V60 guide: a 15 g cup that tastes like you meant it",
    excerpt: "Our workshop recipe for the Hario V60 — ratio, grind, bloom and pour — plus how to fix a cup that tastes sour, bitter or thin.",
    body: v60Body,
    author: "ama-mensah",
    category: "brew-guides",
    tags: "v60, pour-over, filter, beginner",
    publishedDays: 480,
    featured: true,
    seoTitle: "V60 Brew Guide: Ratio, Grind & Pour Technique",
    seoDescription: "Learn to brew a sweet, balanced V60 at home with our step-by-step pour-over recipe, grind settings for popular grinders and troubleshooting tips.",
    coverAlt: "A ceramic V60 dripper on a glass server, mid-pour from a gooseneck kettle",
    status: "draft",
    modifiedDays: 2,
    liveOverrides: {
      title: "How to brew a better V60",
      excerpt: "Our simple V60 recipe: 15 g of coffee, 250 g of water and three minutes.",
      body: v60BodyLive,
      seoDescription: "A simple V60 pour-over recipe from the Fynbos & Fire roastery in Cape Town."
    }
  },
  {
    key: "aeropress-recipes",
    slug: "three-aeropress-recipes",
    title: "Three AeroPress recipes we actually use (including the upside-down one)",
    excerpt: "A clean everyday cup, a concentrated 'espresso-style' shot for milk, and the inverted recipe our team keeps coming back to.",
    body: paragraphs(
      `The AeroPress might be the most forgiving brewer ever made. It is nearly unbreakable, it cleans itself in ten seconds, and it tolerates a wide range of grind sizes and temperatures. That forgiveness is also why there are thousands of AeroPress recipes online. These are the three that live on the laminated card above our training bar.`,
      `The everyday cup. 15 g of coffee, medium grind, 230 g of water at 90 °C. Standard orientation with a rinsed paper filter. Pour all the water in ten seconds, stir three times, put the plunger on to create a seal, and wait until 1:45. Swirl, then press gently for about 30 seconds. It is clean, sweet and very hard to get wrong.`,
      `The concentrate for milk. 18 g of coffee, fine grind, 90 g of water at 85 °C. Stir vigorously for ten seconds, wait one minute, and press hard. Top with 120 ml of steamed or cold milk. It is not espresso — nothing without nine bars of pressure is — but with our ${shopLink("house-espresso-blend")} it makes a flat-white-adjacent drink that has saved many a load-shedding morning.`,
      `The inverted recipe. Put the plunger in about 1 cm, flip the AeroPress upside down and stand it on the plunger. Add 16 g of coffee ground slightly coarser than for pour-over and 240 g of water at 93 °C. Stir, cap it with a rinsed filter, and steep for two minutes. Then — carefully — flip it onto your mug and press. Inverted brewing stops coffee dripping through during the steep, so it behaves more like a small French press with a paper filter: fuller body, still clean.`,
      `A few notes that apply to all three. Fresh-ground coffee matters more than any recipe. Paper filters give a cleaner cup than metal ones. And if you travel, the ${shopLink("aeropress-go")} packs everything — including a mug — into a space smaller than a cooldrink can.`
    ),
    author: "ama-mensah",
    category: "brew-guides",
    tags: "aeropress, recipes, travel, inverted",
    publishedDays: 455,
    seoTitle: "3 AeroPress Recipes: Classic, Concentrate & Inverted",
    seoDescription: "Three tested AeroPress recipes from our barista trainers, with grind, ratio and timing for each.",
    coverAlt: "An AeroPress pressing coffee into an enamel mug on a wooden table"
  },
  {
    key: "espresso-dial-in",
    slug: "dialling-in-espresso-at-home",
    title: "Dialling in espresso at home without losing your mind",
    excerpt: "Dose, yield, time — in that order. A calm, repeatable method for getting a sweet shot from a new bag of beans.",
    body: paragraphs(
      `Every new bag of coffee means dialling in again, and for many home baristas that means a morning of sink shots and swearing. It doesn't have to. The method below is the one we teach wholesale partners, and it works just as well on a home machine.`,
      `Fix your dose first. Your basket has a design dose, usually stamped on it: 18 g for most double baskets. Use it, weigh it every time, and don't change it while you are dialling in. Dose is the foundation; if it moves, everything else moves with it.`,
      `Choose a ratio. For our ${shopLink("house-espresso-blend")} we start at 1:2 — 18 g in, 36 g out. Lighter single origins often taste better longer, at 1:2.3 or even 1:2.5. Put a scale under your cup and stop the shot on weight, not on time or volume.`,
      `Then adjust grind to hit time. With dose and yield fixed, grind size is the only thing you are changing. We aim for 27–32 seconds from pressing the button. Too fast? Grind finer. Too slow? Grind coarser. On a stepless grinder, make small moves. On the ${shopLink("baratza-encore-esp")}, one number on the espresso range is a meaningful change.`,
      `Taste, don't just time. Time is a guide, not a goal. A 30-second shot that tastes sour is still under-extracted. Sourness, a thin body and a short finish mean you need more extraction: grind finer or pull a longer ratio. Bitterness, astringency and a hollow middle mean you have gone too far.`,
      `Keep a notebook. Date, coffee, roast date, dose, yield, time, grind setting, a few words about taste. It feels fussy for a week. After a month it is the most useful thing on your counter.`,
      `Finally, remember that coffee changes. A shot that was perfect five days off roast may run faster at three weeks as the beans degas. Small grind adjustments over the life of a bag are normal — they are not a sign you did it wrong.`
    ),
    author: "ama-mensah",
    category: "brew-guides",
    tags: "espresso, dial-in, home barista, grinder",
    publishedDays: 400,
    featured: true,
    seoTitle: "How to Dial In Espresso at Home",
    seoDescription: "A calm, repeatable method for dialling in espresso: fix your dose, pick a ratio, then use grind size to hit your shot time.",
    coverAlt: "Espresso pouring from a bottomless portafilter into a glass cup on a scale"
  },
  {
    key: "ethiopia-origin-trip",
    slug: "ten-days-in-yirgacheffe",
    title: "Ten days in Yirgacheffe: notes from the Kochere washing stations",
    excerpt: "Pieter's field notes from Gedeo Zone — the smallholders, the washing stations and why our Kochere tastes like jasmine and lemon.",
    body: paragraphs(
      `The road south from Addis Ababa to Dilla takes most of a day, and the last stretch into Kochere woreda climbs through enset and shade trees so dense that you smell the coffee before you see it. We arrived in late November, at the height of the harvest, and spent ten days moving between three washing stations that supply our Yirgacheffe.`,
      `Almost none of this coffee is grown on what a European would call a farm. The typical Gedeo smallholder has less than a hectare, planted with heirloom varieties among false banana, avocado and cordia trees. They deliver cherry to a washing station in the afternoon, often carried on their backs for several kilometres, and are paid on the spot by weight.`,
      `At the station, cherry is hand-sorted, pulped, fermented under water for 36 to 48 hours, washed in long channels and then dried on raised African beds for twelve to fifteen days. The workers turn the parchment every hour, and cover it in the heat of the afternoon so it doesn't crack. It is slow, precise and extraordinarily labour-intensive, and it is the reason washed Yirgacheffe tastes so clean.`,
      `We cupped over 40 day-lots at the station laboratory. The one we bought — lot 14 — had the brightest acidity of the week: lemon, jasmine, white peach and a black-tea finish. At 1,950 to 2,100 metres, cool nights slow cherry maturation, and the result is a denser bean with more of the organic acids that read as brightness in the cup.`,
      `We pay a premium over the Ethiopian Commodity Exchange reference price and a second payment to the station owner once the coffee is sold, which he has committed to passing on to his cherry suppliers. We saw last year's second payment ledger with our own eyes; it is not a perfect system, but it is a traceable one.`,
      `Our ${shopLink("ethiopia-yirgacheffe-kochere")} is roasted light for filter. Brew it on a V60 or Chemex, let it cool a little, and you will taste those washing channels in Kochere.`
    ),
    author: "pieter-van-wyk",
    category: "origins",
    tags: "ethiopia, yirgacheffe, washed, origin trip",
    publishedDays: 290,
    featured: true,
    seoTitle: "Yirgacheffe Origin Trip: Inside the Kochere Washing Stations",
    seoDescription: "Field notes from ten days in Ethiopia's Gedeo Zone, where our washed Yirgacheffe Kochere is grown, processed and bought.",
    coverAlt: "Coffee parchment drying on raised beds at a washing station in Yirgacheffe"
  },
  {
    key: "kenya-nyeri-trip",
    slug: "nyeri-after-the-rains",
    title: "Nyeri after the rains: how we bought this year's Gatomboya AA",
    excerpt: "Inside the Gatomboya factory in Nyeri — cooperative farming, the famous Kenyan double fermentation and what we paid for this year's AA lot.",
    body: kenyaBody,
    author: "pieter-van-wyk",
    category: "origins",
    tags: "kenya, nyeri, SL28, cooperative, origin trip",
    publishedDays: 165,
    seoTitle: "Nyeri, Kenya: Buying the Gatomboya AA",
    seoDescription: "Our green buyer on visiting the Gatomboya factory in Nyeri, how Kenyan coffee is processed, and the price we paid for the AA lot.",
    coverAlt: "Rows of coffee trees on a misty hillside in Nyeri, Kenya",
    status: "queued_to_publish",
    modifiedDays: 1,
    liveOverrides: {
      title: "Nyeri after the rains: buying the Gatomboya AA",
      excerpt: "Notes from the Gatomboya factory in Nyeri and this year's AA lot.",
      body: kenyaBodyLive
    }
  },
  {
    key: "colombia-huila",
    slug: "la-esperanza-huila",
    title: "La Esperanza, Huila: the Muñoz family behind our Colombian",
    excerpt: "A photo essay from Pitalito, where Doña Rubiela Muñoz and her sons grow the caturra and pink bourbon in our Colombia Huila.",
    body: paragraphs(
      `Finca La Esperanza sits at 1,750 metres above the town of Pitalito, in the south of Huila. To get there you take a jeep up a road that is more suggestion than route, past plantain groves and drying patios, until the cloud forest begins. Doña Rubiela Muñoz has farmed here for 31 years, and for the last six she has sold part of her harvest to us.`,
      `The farm is just under four hectares. Doña Rubiela grows caturra and castillo, and — since 2021 — a small block of pink bourbon that her eldest son, Andrés, is quietly obsessed with. Cherry is picked selectively, fermented overnight in plastic tanks and dried in a parabolic dryer, a greenhouse-like tunnel that keeps the rain off during Huila's unpredictable harvests.`,
      `"Antes vendíamos todo al intermediario," she told me — before, we sold everything to the middleman — "and we never knew where the coffee went." Now each harvest arrives in Cape Town with her name on the bag, and every year Pieter brings back photos of the café customers who drink it. She keeps them pinned above the depulper.`,
      `In the cup, La Esperanza is everything people love about Huila: panela sweetness, red apple, a soft citrus acidity and a chocolatey finish that makes it one of the most versatile coffees we roast. It is as good in a moka pot as in a V60, and it is a favourite in our wholesale cafés for milk drinks.`,
      `Our ${shopLink("colombia-huila-la-esperanza")} is roasted medium-light. Gracias, Doña Rubiela.`
    ),
    author: "marco-ferreira",
    category: "origins",
    tags: "colombia, huila, photo essay, smallholder",
    publishedDays: 230,
    seoTitle: "Finca La Esperanza, Huila: Meet the Muñoz Family",
    seoDescription: "A photo essay from Pitalito, Colombia, on the family farm that grows our Colombia Huila La Esperanza.",
    coverAlt: "Doña Rubiela Muñoz holding ripe coffee cherries at Finca La Esperanza"
  },
  {
    key: "comandante-vs-encore",
    slug: "comandante-c40-vs-baratza-encore-esp",
    title: "Comandante C40 vs Baratza Encore ESP: which grinder should you buy first?",
    excerpt: "A hand grinder that costs twice as much, or an electric one that does espresso? We used both daily for three months to find out.",
    body: paragraphs(
      `This is the question we get asked more than any other at the roastery counter: "I have a budget of about R4,000 to R7,000 — which grinder should I buy?" In our range the answer is almost always one of two machines, the ${shopLink("comandante-c40-grinder")} hand grinder or the ${shopLink("baratza-encore-esp")} electric. We used both every day for three months, for filter and espresso, to give a proper answer.`,
      `Grind quality. For filter coffee, the Comandante is the better grinder. Its Nitro Blade burrs produce a remarkably even grind with very few fines, and cups are noticeably clearer and more articulate, especially with light-roasted washed coffees. The Encore ESP is very good for its price, but side by side the cups are a touch muddier.`,
      `Espresso. Here the Encore ESP wins, and not narrowly. Its dedicated espresso range has fine, microscopic steps that make dialling in easy. The Comandante can grind for espresso — and the optional Red Clix axle helps — but hand-grinding 18 g at espresso fineness takes over a minute of real effort. Every morning. Before coffee.`,
      `Speed and convenience. The Encore ESP grinds a 15 g filter dose in about ten seconds. The Comandante takes 40–50 seconds, which some people find meditative and others find a reason to skip their morning coffee. Be honest with yourself about which one you are.`,
      `Load-shedding. A point in the Comandante's favour that only South Africans will appreciate: it works at 06:00 during stage 6.`,
      `Our verdict. If you mostly brew filter, love light roasts and don't mind the workout, buy the Comandante — it will last decades. If you make espresso, or share your kitchen with people who want coffee quickly, the Encore ESP is the more sensible first grinder. Either will improve your coffee more than any brewer upgrade.`,
      `Disclosure: we sell both grinders. We paid for our review units from our own stock and neither Comandante nor Baratza saw this review before publication.`
    ),
    author: "jordan-le-roux",
    category: "gear-reviews",
    tags: "grinders, comandante, baratza, review, espresso",
    publishedDays: 210,
    featured: true,
    seoTitle: "Comandante C40 vs Baratza Encore ESP: Grinder Review",
    seoDescription: "We used the Comandante C40 and Baratza Encore ESP daily for three months. Here is which grinder to buy first for filter or espresso.",
    coverAlt: "A Comandante C40 hand grinder beside a Baratza Encore ESP on a kitchen counter",
    status: "draft",
    modifiedDays: 5,
    liveOverrides: {
      seoTitle: "Comandante vs Encore ESP — which grinder?",
      body: paragraphs(
        `This is the question we get asked most at the roastery counter: which grinder should I buy first? In our range it is usually the ${shopLink("comandante-c40-grinder")} or the ${shopLink("baratza-encore-esp")}.`,
        `For filter coffee the Comandante produces a clearer, more even cup. For espresso the Encore ESP is far easier to dial in and much faster.`,
        `If you mostly brew filter and don't mind hand-grinding, buy the Comandante. If you make espresso, buy the Encore ESP.`
      )
    }
  },
  {
    key: "cold-brew",
    slug: "cold-brew-for-a-cape-town-summer",
    title: "Cold brew for a Cape Town summer (and why we steep it for 16 hours)",
    excerpt: "Our café cold-brew concentrate, scaled down for a home fridge: coarse grind, 1:8 ratio, 16 hours, and a few ways to serve it.",
    body: paragraphs(
      `When the south-easter drops and Cape Town hits 34 °C, our wholesale cafés go through cold brew by the bucket. This is the recipe they use, scaled down to fit a one-litre jar in your fridge.`,
      `You'll need 100 g of coffee, 800 g of cold filtered water, a large jar and something to filter with: a nut-milk bag, a French press, or a V60 with a paper filter for the cleanest result. We like the ${shopLink("brazil-cerrado-natural")} for cold brew — its chocolate and hazelnut notes survive the long, cold extraction beautifully.`,
      `Grind coarse, like rough sea salt. Fine grounds over-extract during a long steep and make filtering a nightmare. Add the coffee and water to the jar, stir until every ground is wet, and put the lid on.`,
      `Steep for 16 hours in the fridge. We have tested everything from 8 to 24 hours. Below 12 hours the concentrate tastes thin and grassy; beyond 20 it becomes woody and flat. Sixteen is the sweet spot — conveniently, that is an overnight steep started after dinner.`,
      `Filter twice. Pour through a coarse filter first to remove most of the grounds, then through paper to clean it up. You'll get about 600 ml of concentrate, which keeps for ten days sealed in the fridge.`,
      `To serve, dilute 1:1 with water or milk over plenty of ice. For something special, top 60 ml of concentrate with tonic water and a twist of orange peel, or pour it over a scoop of vanilla ice cream for an easy affogato.`
    ),
    author: "fatima-patel",
    category: "recipes",
    tags: "cold brew, iced coffee, summer, recipe",
    publishedDays: 250,
    seoTitle: "Easy Cold Brew Coffee Recipe (16-Hour Method)",
    seoDescription: "Make café-quality cold brew concentrate at home with our 1:8, 16-hour recipe — plus three ways to serve it.",
    coverAlt: "A jar of cold brew concentrate beside two iced coffees on a sunny windowsill"
  },
  {
    key: "flash-brew-iced-coffee",
    slug: "flash-brewed-iced-coffee",
    title: "Flash-brewed iced coffee: bright, fast, and better than it has any right to be",
    excerpt: "Brew hot straight onto ice for an iced coffee with all the fruit and aroma of a pour-over — ready in four minutes, no overnight steep.",
    body: paragraphs(
      `Cold brew is smooth and chocolatey, but it loses the bright, fruity character that makes a good Ethiopian or Kenyan special. Flash brewing — sometimes called Japanese-style iced coffee — keeps it. You brew hot, directly onto ice, and the rapid chill locks in aroma.`,
      `The trick is to replace some of your brew water with ice. For one large glass, use 20 g of coffee, 180 g of hot water and 120 g of ice in the server. Grind a little finer than usual, because you are extracting with less water.`,
      `Brew exactly as you would a V60: bloom with 50 g of water for 40 seconds, then pour to 180 g in slow spirals. The coffee drips onto the ice and chills instantly. Swirl the server until the ice has mostly melted and pour over fresh ice.`,
      `This method is made for washed, fruit-forward coffees. Try it with the ${shopLink("kenya-nyeri-gatomboya")} for something that tastes like blackcurrant cordial, or the ${shopLink("ethiopia-yirgacheffe-kochere")} for iced lemon tea with a caffeine problem.`
    ),
    author: "ama-mensah",
    category: "recipes",
    tags: "iced coffee, flash brew, japanese iced coffee, v60",
    publishedDays: 330,
    seoTitle: "Flash-Brewed (Japanese) Iced Coffee Recipe",
    seoDescription: "Brew hot coffee directly onto ice for a bright, aromatic iced coffee in four minutes.",
    coverAlt: "Iced coffee in a tall glass with a V60 dripping onto ice behind it"
  },
  {
    key: "new-roaster",
    slug: "meet-tannie-our-new-roaster",
    title: "Meet Tannie: our new 15 kg roaster has landed in Woodstock",
    excerpt: "After five years on a 5 kg machine, we've installed a 15 kg roaster with an afterburner — here's what changes for your coffee.",
    body: paragraphs(
      `On a grey Tuesday in May, a flatbed truck reversed very slowly down Albert Road and a crane lifted a 1.2-tonne roaster through the front of our Woodstock roastery. The team named her Tannie before she was even bolted to the floor.`,
      `We have roasted every bean you've bought from us on a 5 kg drum roaster since 2021. It served us brilliantly, but by last summer it was running eleven hours a day, six days a week, and we were turning down wholesale partners. Tannie roasts up to 15 kg per batch, which means fewer, more consistent batches and a lot fewer 04:00 starts for Lindiwe.`,
      `More importantly, Tannie comes with a catalytic afterburner that cleans the smoke from roasting before it leaves our chimney. Our neighbours — a bakery and a recording studio — have been very patient. They deserve this more than anyone.`,
      `Will your coffee taste different? We hope not, or at least not in any way you'd notice. We spent six weeks profiling every coffee on both machines side by side, and we only switched each one over when blind cupping couldn't tell them apart. The ${shopLink("house-espresso-blend")} was the last to move — our wholesale cafés are, rightly, very particular about it.`,
      `Come and meet her at our Saturday open roastery, 09:00 to 13:00. She is loud, she is warm and she smells amazing.`
    ),
    author: "lindiwe-khumalo",
    category: "roastery-news",
    tags: "roastery, woodstock, news, behind the scenes",
    publishedDays: 110,
    featured: true,
    seoTitle: "Meet Tannie, Our New 15 kg Coffee Roaster",
    seoDescription: "We've installed a 15 kg roaster with an afterburner at our Woodstock roastery. Here's what it means for your coffee.",
    coverAlt: "A new black-and-copper coffee roaster being installed in a brick warehouse"
  },
  {
    key: "transparency-report-2026",
    slug: "transparency-report-2026",
    title: "Our 2026 transparency report: what we paid, and to whom",
    excerpt: "Every green coffee we bought this year, what we paid per kilogram, how that compares to the market, and where we fell short.",
    body: paragraphs(
      `Specialty coffee loves the words "direct trade" and "ethically sourced", and almost never backs them with numbers. This is our third transparency report, and like the first two it lists every green coffee we bought in the past twelve months, who we bought it from, and what we paid.`,
      `This year we bought 38.4 tonnes of green coffee across 14 lots from six countries. The weighted average price we paid was USD 7.42 per kilogram FOB, compared with an average New York "C" market price of USD 5.18 over the same period. 71% of our volume came from producers we have bought from for at least three consecutive years.`,
      `Our biggest single relationship remains the Kochere washing stations in Ethiopia, followed by Gatomboya in Kenya and Finca La Esperanza in Colombia. For the first time, we also bought from a women-led cooperative in Huye, Rwanda — the lot behind our ${shopLink("rwanda-huye-mountain")}.`,
      `Where we fell short: our Brazilian coffee is bought through an exporter, and while we know the farm, we could not verify the price paid to the producer. We have set ourselves a goal of full farm-gate price visibility for every lot by 2028, and we will report on progress, including failures, next year.`,
      `The full table, with lot-level prices and volumes, is available as a download at the end of this report.`
    ),
    author: "zanele-ndlovu",
    category: "sustainability",
    tags: "transparency, direct trade, pricing, report",
    publishedDays: -5,
    seoTitle: "2026 Coffee Transparency Report",
    seoDescription: "What Fynbos & Fire paid for every green coffee lot this year, how it compares to the market, and where we fell short.",
    coverAlt: "Green coffee sacks stacked in the Fynbos & Fire warehouse",
    status: "queued_to_publish",
    modifiedDays: 1
  },
  {
    key: "compostable-bags",
    slug: "home-compostable-coffee-bags",
    title: "Why our bags are now home-compostable (and what took so long)",
    excerpt: "Our new bags break down in a home compost heap in about six months. Here's why it took three years and four failed suppliers to get here.",
    body: paragraphs(
      `Coffee packaging is harder than it looks. A bag has to keep oxygen and moisture out for months, let carbon dioxide escape through a one-way valve, survive a courier van in a Karoo summer, and ideally not end up in a landfill for 400 years. Most "eco" bags manage two of those.`,
      `Since August, every retail bag we ship is certified home-compostable to the Australian AS 5810 standard. The outer layer is kraft paper, the barrier is a plant-based film, and even the degassing valve and label adhesive are compostable. In our own test heap behind the roastery, a shredded bag had disappeared in 26 weeks.`,
      `It took so long because the first four materials we trialled failed. Two let enough oxygen through that coffee tasted stale within three weeks. One cracked at the seal. One was genuinely compostable, but only in industrial facilities — and Cape Town has very few that accept packaging from households.`,
      `The new bags cost us about 40% more than the old foil-lined ones. We have absorbed that cost rather than raising prices. If you don't have a compost heap, the bags can go in your garden-waste bin, or bring them back to the roastery and we'll compost them with our chaff.`
    ),
    author: "zanele-ndlovu",
    category: "sustainability",
    tags: "packaging, compostable, sustainability, waste",
    publishedDays: 60,
    seoTitle: "Home-Compostable Coffee Bags: Why We Switched",
    seoDescription: "Our coffee bags are now certified home-compostable. Here's how we tested them and why it took three years.",
    coverAlt: "Kraft paper coffee bags beside a garden compost heap"
  },
  {
    key: "cafe-kaffie-ikofu",
    slug: "cafe-kaffie-ikofu",
    title: "Café, kaffie, ikofu: how Cape Town says coffee ☕",
    excerpt: "From Bo-Kaap moer koffie to the Xhosa ikofu and a Portuguese bica, a look at the many languages of coffee in our city.",
    body: paragraphs(
      `Walk ten minutes in any direction from our roastery and you will hear coffee ordered in half a dozen languages. In Afrikaans it is kaffie or koffie; in isiXhosa, ikofu; in isiZulu, ikhofi. At the Portuguese deli on Victoria Road the owner still calls an espresso a bica, and our Congolese regulars ask for a café noir, sans sucre, s'il vous plaît.`,
      `Many Capetonians grew up on moer koffie — ground coffee boiled in a pot and left to settle, the grounds "moered" down with a splash of cold water. It is strong, it is gritty, and for a lot of older customers it is the taste of home. Our ${shopLink("table-mountain-filter-blend")} started life as an attempt to make a filter coffee that tasted familiar to people raised on it.`,
      `Molo, sawubona, goeie môre — however you greet the morning, we are glad you start it with us. Enkosi kakhulu for reading.`
    ),
    author: "zanele-ndlovu",
    category: "roastery-news",
    tags: "culture, cape town, language, community",
    publishedDays: 180,
    seoTitle: "",
    seoDescription: "",
    coverAlt: "Coffee cups on a café counter in the Bo-Kaap, Cape Town"
  },
  {
    key: "rwanda-147-roasts",
    slug: "rwanda-huye-147-roasts",
    title:
      "Everything we learned from roasting, cupping, brewing and re-brewing the same Rwandan lot 147 times over one very long, very caffeinated Cape Town winter in Woodstock",
    excerpt: "One lot, 147 roast profiles, and a lot of spreadsheets: what an obsessive winter taught us about roasting washed Rwandan coffee.",
    body: paragraphs(
      `Last winter we bought more of one Rwandan lot than we have ever bought of anything, and we decided to use it as an experiment. Over fourteen weeks, Lindiwe roasted it 147 different ways, varying charge temperature, development time and airflow, and the whole team cupped every single batch blind.`,
      `The big lesson: development time after first crack mattered far more than total roast time. Between 1:20 and 1:40 the coffee tasted of red plum and black tea; beyond two minutes, the fruit disappeared into caramel and the cup went flat. Charge temperature barely registered on the table.`,
      `The second lesson was humility. Our favourite profile on the cupping table was not our favourite in a V60, and the best espresso roast was one we had scored in the middle of the pack. We now cup every candidate profile as both filter and espresso before choosing.`,
      `The winning filter profile is what you get in every bag of ${shopLink("rwanda-huye-mountain")} today. The spreadsheet has 4,116 rows. Nobody is allowed to open it before 10:00.`
    ),
    author: "lindiwe-khumalo",
    category: "origins",
    tags: "rwanda, roasting, experiment, cupping",
    publishedDays: 75,
    seoTitle: "147 Roasts of One Rwandan Coffee: What We Learned",
    seoDescription: "What roasting a single washed Rwandan lot 147 ways taught us about development time, cupping and brewing.",
    coverAlt: "Rows of cupping bowls on a long table at the roastery"
  }
];

// --- Generated articles (deterministic, from topic templates) ----------------

const rand = createRandom(20260901);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

type GeneratedTopic = {
  key: string;
  category: CategorySlug;
  authors: AuthorSlug[];
  titles: string[];
  excerpt: string;
  body: string;
  tags: string;
  coverAlt: string | null;
  seoTitle?: string;
};

type OriginItem = {
  key: string;
  country: string;
  region: string;
  name: string;
  process: string;
  altitude: string;
  varieties: string;
  notes: string;
  producer: string;
  brew: string;
  product?: ProductSlug;
};

const origins: OriginItem[] = [
  {
    key: "rwanda-huye",
    country: "Rwanda",
    region: "Huye",
    name: "Huye Mountain",
    process: "washed",
    altitude: "1,900–2,100 m",
    varieties: "Red Bourbon",
    notes: "red plum, black tea and orange blossom",
    producer: "a women-led cooperative of about 600 members on the slopes of Mount Huye",
    brew: "a V60 or Kalita Wave",
    product: "rwanda-huye-mountain"
  },
  {
    key: "brazil-cerrado",
    country: "Brazil",
    region: "Cerrado Mineiro",
    name: "Cerrado Natural",
    process: "natural",
    altitude: "1,100–1,250 m",
    varieties: "Yellow Catuaí and Mundo Novo",
    notes: "milk chocolate, roasted hazelnut and dried fig",
    producer: "the Oliveira family's 180-hectare farm near Patrocínio",
    brew: "espresso, a moka pot or cold brew",
    product: "brazil-cerrado-natural"
  },
  {
    key: "peru-decaf",
    country: "Peru",
    region: "Cajamarca",
    name: "Swiss Water Decaf",
    process: "washed, Swiss Water decaffeinated",
    altitude: "1,700–1,900 m",
    varieties: "Caturra, Bourbon and Typica",
    notes: "cocoa nib, brown sugar and red apple",
    producer: "smallholders in the San Ignacio province who sell through the Cenfrocafe cooperative",
    brew: "a French press or a milky flat white",
    product: "swiss-water-decaf-peru"
  },
  {
    key: "burundi-kayanza",
    country: "Burundi",
    region: "Kayanza",
    name: "Kayanza Honey",
    process: "honey",
    altitude: "1,800–1,950 m",
    varieties: "Red Bourbon",
    notes: "hibiscus, raspberry jam and panela",
    producer: "the Buziraguhindwa washing station, which buys cherry from around 2,000 families",
    brew: "an AeroPress or a Chemex"
  },
  {
    key: "guatemala-huehuetenango",
    country: "Guatemala",
    region: "Huehuetenango",
    name: "Huehuetenango",
    process: "washed",
    altitude: "1,600–1,900 m",
    varieties: "Bourbon, Caturra and Pache",
    notes: "green apple, toffee and cocoa",
    producer: "a group of 12 neighbouring farms around La Libertad",
    brew: "a Clever dripper or drip machine"
  }
];

function originTopic(item: OriginItem): GeneratedTopic {
  const shop = item.product ? ` You'll find it in the shop at ${shopLink(item.product)}.` : ` This lot sold out in five weeks; we hope to buy from ${item.region} again next season.`;
  return {
    key: `origin-${item.key}`,
    category: "origins",
    authors: ["pieter-van-wyk", "lindiwe-khumalo"],
    titles: [
      `Origin notes: ${item.region}, ${item.country}`,
      `Cupping table: our ${item.country} ${item.name}`,
      `Why ${item.region} coffee tastes the way it does`
    ],
    excerpt: `Where our ${item.country} ${item.name} comes from, how it's ${item.process.split(",")[0]} processed and why it tastes of ${item.notes}.`,
    body: paragraphs(
      `Our ${item.country} ${item.name} comes from ${item.producer}. The coffee is grown at ${item.altitude} in ${item.region}, and is mostly ${item.varieties}.`,
      pick([
        `Altitude matters here. Cooler nights slow the ripening of the cherry, giving the seed more time to develop sugars and acids, and that density shows up both in the roaster and in the cup.`,
        `It is the kind of coffee that makes a strong case for terroir: soil, altitude, rainfall and the people doing the picking all leave fingerprints you can taste.`,
        `We first cupped a sample of this coffee in a crowded lab at origin and asked for a second sample before we had finished the first bowl.`
      ]),
      `This lot is ${item.process} processed. ${pick([
        "Processing is where a producer's skill becomes most visible, and here it is meticulous.",
        "Processing shapes the cup as much as variety or altitude, and this lot is a textbook example.",
        "Every processing step is logged by lot, which makes it one of the most traceable coffees we buy."
      ])} On our table it tastes of ${item.notes}.`,
      `We roast it to highlight that character and recommend brewing it with ${item.brew}. ${pick([
        "Give it at least five days off roast before opening the bag.",
        "It is at its best between one and four weeks after roasting.",
        "Try it slightly cooler than usual — around 90 °C — to keep the sweetness front and centre."
      ])}${shop}`
    ),
    tags: `${item.country.toLowerCase()}, ${item.region.toLowerCase()}, ${item.process.split(",")[0]}, single origin`,
    coverAlt: `Coffee farm landscape in ${item.region}, ${item.country}`
  };
}

type MethodItem = { key: string; method: string; ratio: string; grind: string; time: string; tip: string; product?: ProductSlug };

const methods: MethodItem[] = [
  { key: "chemex", method: "Chemex", ratio: "30 g of coffee to 500 g of water", grind: "medium-coarse, like kosher salt", time: "4:00 to 4:30", tip: "The thick bonded filters need a very thorough rinse.", product: "chemex-six-cup" },
  { key: "french-press", method: "French press", ratio: "30 g of coffee to 500 g of water", grind: "coarse, like breadcrumbs", time: "4:00 steep, then 5 minutes of settling", tip: "Skim the crust off the top instead of plunging hard." },
  { key: "moka-pot", method: "moka pot", ratio: "a full basket, level but not tamped", grind: "fine, a little coarser than espresso", time: "about 4 minutes on a medium flame", tip: "Start with water just off the boil so the grounds don't cook on the stove." },
  { key: "clever-dripper", method: "Clever dripper", ratio: "18 g of coffee to 300 g of water", grind: "medium, like granulated sugar", time: "2:30 steep plus a 1-minute drawdown", tip: "Add water first, then coffee, for a faster, more even drawdown." },
  { key: "kalita-wave", method: "Kalita Wave", ratio: "20 g of coffee to 320 g of water", grind: "medium-fine", time: "3:15 to 3:45", tip: "Pour in small, frequent pulses to keep the bed level." }
];

function methodTopic(item: MethodItem): GeneratedTopic {
  return {
    key: `brew-${item.key}`,
    category: "brew-guides",
    authors: ["ama-mensah", "ama-mensah", "fatima-patel"],
    titles: [
      `${item.method[0].toUpperCase()}${item.method.slice(1)} brew guide: ratio, grind and timing`,
      `Getting more sweetness out of your ${item.method}`,
      `A weekday ${item.method} recipe in under five minutes`
    ],
    excerpt: `Our tested ${item.method} recipe — ${item.ratio}, ground ${item.grind.split(",")[0]} — and the one adjustment that fixes most bad cups.`,
    body: paragraphs(
      pick([
        `The ${item.method} is one of the most requested topics in our workshops, and one of the most misunderstood.`,
        `Plenty of people own a ${item.method} and quietly suspect they are using it wrong. Most of the time, they are only one adjustment away from a great cup.`,
        `We brew on the ${item.method} at the roastery more often than you might expect, especially for customers who want a reliable cup without a lot of fuss.`
      ]),
      `Start with ${item.ratio}. Grind ${item.grind}. Total brew time should land around ${item.time}. ${item.tip}`,
      `If your cup tastes sour or thin, grind finer or extend the brew slightly. If it tastes bitter or dry, go coarser. ${pick([
        "Change one variable at a time and write it down.",
        "Resist the urge to change the ratio and the grind on the same day.",
        "A scale and a timer will teach you more than any recipe card."
      ])}`,
      `${pick([
        "A medium roast is the easiest place to start",
        "Our blends are designed to be forgiving on this brewer",
        "Washed coffees tend to shine here"
      ])}; try the ${shopLink(item.key === "moka-pot" ? "house-espresso-blend" : "table-mountain-filter-blend")} if you want a dependable baseline.${item.product ? ` We stock the brewer too: ${shopLink(item.product)}.` : ""}`
    ),
    tags: `${item.method.toLowerCase()}, brew guide, recipe, home brewing`,
    coverAlt: `Coffee brewing in a ${item.method} on a kitchen counter`
  };
}

type DrinkItem = { key: string; drink: string; lede: string; method: string; serve: string };

const drinks: DrinkItem[] = [
  {
    key: "espresso-tonic",
    drink: "Espresso tonic",
    lede: "Bitter, fizzy, bright and absurdly refreshing, the espresso tonic has become our most-ordered summer drink at the Saturday bar.",
    method: "Fill a tall glass with ice, add 150 ml of chilled tonic water, and slowly pour a double shot of espresso over the back of a spoon so it floats on top.",
    serve: "Finish with a slice of orange or a sprig of fynbos rosemary. A fruity natural espresso is spectacular here."
  },
  {
    key: "affogato",
    drink: "Affogato",
    lede: "Half dessert, half coffee and entirely the reason our team meetings run long, affogato is the easiest impressive thing you can make with an espresso machine.",
    method: "Put one generous scoop of good vanilla ice cream into a small, chilled glass and pour a freshly pulled double espresso directly over it.",
    serve: "Serve immediately with a spoon. A crumbled Romany Cream on top is not traditional, but it is correct."
  },
  {
    key: "flat-white",
    drink: "Flat white",
    lede: "The flat white is a small, strong milk coffee with a thin layer of silky microfoam — and it is the drink that separates good baristas from great ones.",
    method: "Pull a double ristretto of about 30 g into a 160 ml cup. Steam 120 ml of cold milk to 60 °C, stretching it only briefly so the foam stays thin and glossy, then pour steadily from close to the surface.",
    serve: "It should be velvety rather than frothy, with the coffee still clearly in charge."
  },
  {
    key: "irish-coffee",
    drink: "Irish coffee",
    lede: "When the Cape winter sets in and the rain comes sideways off the mountain, nothing competes with a properly made Irish coffee.",
    method: "Warm a glass, add two teaspoons of brown sugar and 150 ml of hot, strong filter coffee, and stir until dissolved. Add 40 ml of Irish whiskey, then float lightly whipped cream over the back of a spoon.",
    serve: "Don't stir — drink the hot coffee through the cold cream. That contrast is the whole point."
  },
  {
    key: "iced-oat-latte",
    drink: "Iced oat latte",
    lede: "Our wholesale partners tell us the iced oat latte now outsells the hot version from October to March, and we are not surprised.",
    method: "Pull a double shot over a handful of ice to chill it quickly, then pour in 180 ml of cold barista-style oat milk and top up with more ice.",
    serve: "A dash of vanilla or a teaspoon of honey syrup works well; stir before drinking."
  }
];

function drinkTopic(item: DrinkItem): GeneratedTopic {
  // Proper nouns (Irish) keep their capital when the drink name is used mid-sentence.
  const lower = item.drink.replace(/^[A-Z][a-z]+/, (word) => (word === "Irish" ? word : word.toLowerCase()));
  return {
    key: `recipe-${item.key}`,
    category: "recipes",
    authors: ["fatima-patel", "ama-mensah"],
    titles: [`How to make ${/^[aeiouAEIOU]/.test(lower) ? "an" : "a"} ${lower} at home`, `${item.drink}: the recipe from our Saturday bar`, `The ${lower}, done properly`],
    excerpt: `Our barista team's ${lower} recipe, adapted for a home kitchen, with the details that make the difference.`,
    body: paragraphs(
      item.lede,
      item.method,
      item.serve,
      pick([
        `We use our ${shopLink("house-espresso-blend")} for this, but any coffee you enjoy as espresso will work.`,
        `No espresso machine? A concentrated AeroPress or moka pot brew gets you most of the way there — our ${shopLink("aeropress-go")} is perfect for it.`,
        `For a caffeine-free evening version, the ${shopLink("swiss-water-decaf-peru")} holds up beautifully.`
      ])
    ),
    tags: `${item.drink.toLowerCase()}, recipe, coffee drinks`,
    coverAlt: `${item.drink} in a glass on a marble counter`
  };
}

type GearItem = { key: string; gear: string; product: ProductSlug; good: string; bad: string; verdict: string };

const gear: GearItem[] = [
  {
    key: "chemex",
    gear: "Chemex six-cup",
    product: "chemex-six-cup",
    good: "It makes a remarkably clean, tea-like cup and brews enough for four people at once. It also looks beautiful on the counter, which matters more than reviewers like to admit.",
    bad: "The proprietary filters are expensive locally and the narrow neck makes it annoying to clean without a bottle brush.",
    verdict: "Buy it if you regularly brew for more than one person and love light, delicate coffees."
  },
  {
    key: "gooseneck-kettle",
    gear: "900 ml gooseneck kettle",
    product: "gooseneck-kettle-900ml",
    good: "Pour control is excellent, the temperature hold is accurate to within a degree, and it reaches 94 °C from cold in under three minutes.",
    bad: "The 900 ml capacity is tight if you brew a large Chemex, and the base is bulky on a small counter.",
    verdict: "The single biggest upgrade for pour-over after a grinder and a scale."
  },
  {
    key: "brew-scale",
    gear: "digital brew scale",
    product: "digital-brew-scale",
    good: "It reads to 0.1 g, has a built-in timer, and the auto-tare mode means one less button to press while pouring.",
    bad: "The rechargeable battery lasts about three weeks of daily use, and the USB-C flap feels fragile.",
    verdict: "Every home brewer should own a scale; this one is a solid, affordable choice."
  },
  {
    key: "aeropress-go",
    gear: "AeroPress Go",
    product: "aeropress-go",
    good: "Everything packs into its own mug, it survives being dropped off a tailgate, and it brews just as well as the original.",
    bad: "The smaller chamber limits you to about 250 ml per brew, and the included mug lid is flimsy.",
    verdict: "The best travel brewer we know. We have taken one up Kilimanjaro and to a Karoo campsite."
  }
];

function gearTopic(item: GearItem): GeneratedTopic {
  return {
    key: `review-${item.key}`,
    category: "gear-reviews",
    authors: ["jordan-le-roux", "jordan-le-roux", "ama-mensah"],
    titles: [`${item.gear}: six months later`, `Is the ${item.gear} worth it? An honest review`, `Long-term review: the ${item.gear}`],
    excerpt: `We used the ${item.gear} every day for months. Here's what we loved, what annoyed us, and who should buy one.`,
    body: paragraphs(
      pick([
        `We only review gear we have used daily for at least a month. The ${item.gear} has been on our training bar for considerably longer.`,
        `Long-term reviews tell you things launch reviews can't. After months of daily use, here is where we landed on the ${item.gear}.`,
        `A lot of customers ask about the ${item.gear} at the counter, so we put one through a proper long-term test.`
      ]),
      `What's good. ${item.good}`,
      `What's not. ${item.bad}`,
      `Verdict. ${item.verdict} It is available at ${shopLink(item.product)}. Disclosure: we sell it, and we bought our test unit from our own stock.`
    ),
    tags: `${item.gear.toLowerCase()}, review, gear`,
    coverAlt: `The ${item.gear} photographed on a wooden counter`
  };
}

type NewsItem = { key: string; title: string; excerpt: string; body: string[]; coverAlt: string | null; tags: string };

const news: NewsItem[] = [
  {
    key: "saturday-cuppings",
    title: "Saturday public cuppings are back at the roastery",
    excerpt: "Free, walk-in cuppings every Saturday at 10:00 in Woodstock. No experience needed, just bring your nose.",
    body: [
      `After a long winter break, our public cuppings are back. Every Saturday at 10:00, our roasting team sets out six coffees on the long table and walks you through tasting them the way professionals do — slurping included.`,
      `It is free, it takes about 45 minutes, and there is no need to book for groups smaller than six. Children are welcome, though they tend to enjoy the slurping more than the coffee.`,
      `You'll find us at the roastery in Woodstock. Park on the street and follow the smell.`
    ],
    coverAlt: "People tasting coffee around a long cupping table",
    tags: "events, cupping, woodstock"
  },
  {
    key: "stellenbosch-popup",
    title: "Find us at the Stellenbosch Slow Market this summer",
    excerpt: "Our espresso cart will be at the Stellenbosch Slow Market every Saturday from December to February.",
    body: [
      `We're taking the espresso cart on the road. From the first Saturday in December until the end of February, you'll find us at the Stellenbosch Slow Market from 09:00 to 14:00.`,
      `Expect the full espresso menu, espresso tonics, cold brew on tap and retail bags of every coffee we roast. Subscription members get 10% off at the cart.`
    ],
    coverAlt: "An espresso cart under oak trees at an outdoor market",
    tags: "events, stellenbosch, market"
  },
  {
    key: "holiday-shipping",
    title: "Festive season roasting and shipping schedule",
    excerpt: "Our last roast day before the holidays, courier cut-offs, and when subscriptions resume in January.",
    body: [
      `Our last roast day of the year is Friday 19 December. Orders placed before 12:00 on Thursday 18 December will be roasted and dispatched before we close.`,
      `The courier cut-off for delivery before Christmas is Monday 15 December for main centres and Friday 12 December for outlying areas.`,
      `We reopen on Monday 5 January. Subscriptions due over the break will be paused automatically and resume on your next scheduled date. Enjoy the break — and stock up.`
    ],
    coverAlt: null,
    tags: ""
  },
  {
    key: "subscription-update",
    title: "Changes to our coffee subscription, explained",
    excerpt: "More flexible delivery intervals, a new 500 g size and a small price change from next month.",
    body: [
      `From next month you'll be able to choose a delivery every one, two, three or four weeks, and a new 500 g bag size sits between our 250 g and 1 kg options.`,
      `We are also increasing subscription prices by R10 per 250 g bag, the first change in two years, to reflect higher green coffee and courier costs. Subscribers still save 15% on the shop price and get free delivery.`,
      `Nothing changes until your next billing date, and you can pause or cancel at any time from your account.`
    ],
    coverAlt: "A subscription box of coffee bags on a doorstep",
    tags: "subscriptions, announcement"
  }
];

function newsTopic(item: NewsItem): GeneratedTopic {
  return {
    key: `news-${item.key}`,
    category: "roastery-news",
    authors: ["lindiwe-khumalo", "jordan-le-roux", "fatima-patel"],
    titles: [item.title],
    excerpt: item.excerpt,
    body: paragraphs(...item.body),
    tags: item.tags,
    coverAlt: item.coverAlt
  };
}

type SustainItem = { key: string; titles: string[]; excerpt: string; body: string[]; tags: string; coverAlt: string };

const sustainability: SustainItem[] = [
  {
    key: "chaff-compost",
    titles: ["Where our coffee chaff goes: a partnership with an urban farm", "From roaster to garden bed: composting our chaff"],
    excerpt: "Every week we send around 40 kg of roasting chaff to an urban farm in Philippi. Here's why it's so useful.",
    body: [
      `Roasting coffee produces chaff — the papery silver skin that flakes off the bean as it expands. We generate around 40 kg of it a week, and until last year most of it went to landfill.`,
      `Now it goes to an urban farm in Philippi, where it is mixed into compost and used as mulch. Chaff is high in nitrogen and carbon, breaks down quickly and helps sandy Cape Flats soil hold water.`,
      `If you run a community garden and want some, email us. We have plenty.`
    ],
    tags: "compost, waste, community",
    coverAlt: "Handfuls of silver coffee chaff over a vegetable bed"
  },
  {
    key: "water-use",
    titles: ["How much water is in your cup of coffee?", "The hidden water footprint of coffee"],
    excerpt: "From farm to cup, a single cup of coffee uses around 130 litres of water. Here's where it goes, and what we're doing about it.",
    body: [
      `Cape Town learned the hard way, during the 2018 drought, to count every litre. So here is a number that surprised us: producing the coffee for a single cup uses around 130 litres of water, most of it at the farm.`,
      `Washed processing is especially thirsty. Several of the stations we buy from now recirculate fermentation water and treat wastewater in settling ponds before it returns to rivers, and we pay a premium that helps fund it.`,
      `At the roastery, we've cut our own water use by 30% by switching to a closed-loop quench system and harvesting rainwater for cleaning.`
    ],
    tags: "water, drought, processing",
    coverAlt: "Water channels at a coffee washing station"
  },
  {
    key: "courier-emissions",
    titles: ["Shipping coffee with a lower carbon footprint", "What we changed about how your coffee is delivered"],
    excerpt: "Cape Town deliveries now go out by e-bike, and national parcels are consolidated to cut emissions per order.",
    body: [
      `Shipping is the second biggest source of emissions in our business after green coffee freight. This year we made two changes.`,
      `Orders within the Cape Town city bowl and Atlantic Seaboard are now delivered by an electric cargo-bike courier, usually on the same day they are roasted. National orders are consolidated into fewer, larger courier collections instead of daily pickups.`,
      `Together, we estimate these changes have reduced delivery emissions per order by about 35%. We'll publish the measured figure in our next transparency report.`
    ],
    tags: "shipping, carbon, delivery",
    coverAlt: "A courier loading coffee parcels onto an electric cargo bike"
  }
];

function sustainTopic(item: SustainItem): GeneratedTopic {
  return {
    key: `impact-${item.key}`,
    category: "sustainability",
    authors: ["zanele-ndlovu"],
    titles: item.titles,
    excerpt: item.excerpt,
    body: paragraphs(...item.body),
    tags: item.tags,
    coverAlt: item.coverAlt
  };
}

const generatedTopics: GeneratedTopic[] = [
  ...origins.map(originTopic),
  ...methods.map(methodTopic),
  ...drinks.map(drinkTopic),
  ...gear.map(gearTopic),
  ...news.map(newsTopic),
  ...sustainability.map(sustainTopic)
];

/** Status overrides for generated articles, keyed by topic key. */
const generatedStatus: Record<string, Partial<Pick<ArticleSpec, "status" | "liveOverrides" | "modifiedDays" | "publishedDays" | "author" | "excerpt">>> = {
  "brew-french-press": { status: "draft", modifiedDays: 6, liveOverrides: { tags: "french press, brew guide" } },
  "recipe-affogato": { status: "queued_to_publish", modifiedDays: 2, liveOverrides: { excerpt: "Vanilla ice cream, hot espresso, a spoon. That's it." } },
  "impact-courier-emissions": { status: "queued_to_publish", publishedDays: -2, modifiedDays: 0 },
  "review-aeropress-go": { status: "draft", publishedDays: -14, modifiedDays: 3, author: "sam-okafor", excerpt: "" },
  "origin-guatemala-huehuetenango": { status: "not_published", modifiedDays: 90 },
  "news-stellenbosch-popup": { status: "not_published", modifiedDays: 140 },
  "brew-kalita-wave": { status: "draft", publishedDays: -20, modifiedDays: 9 }
};

const generatedArticles: ArticleSpec[] = generatedTopics.map((topic, index) => {
  const picked = pick(topic.titles);
  const title = picked[0].toUpperCase() + picked.slice(1);
  const override = generatedStatus[topic.key] ?? {};
  const publishedDays = override.publishedDays ?? 20 + index * 19 + Math.floor(rand() * 12);
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const withSeo = index % 5 !== 3;
  return {
    key: topic.key,
    slug,
    title,
    excerpt: override.excerpt ?? topic.excerpt,
    body: topic.body,
    author: override.author ?? pick(topic.authors),
    category: topic.category,
    tags: topic.tags,
    publishedDays,
    featured: false,
    seoTitle: withSeo ? title.replace(/:.*$/, "").slice(0, 60) : "",
    seoDescription: withSeo ? topic.excerpt.slice(0, 155) : "",
    coverAlt: topic.coverAlt,
    status: override.status,
    liveOverrides: override.liveOverrides,
    modifiedDays: override.modifiedDays
  };
});

const articleRecords: CmsRecord[] = [...flagshipArticles, ...generatedArticles].map(articleRecord);

// --- FAQs --------------------------------------------------------------------

type FaqSpec = { key: string; topic: "general" | "orders" | "shipping" | "returns" | "products" | "account"; question: string; answer: string; status?: PublishStatus; live?: Values };

const faqSpecs: FaqSpec[] = [
  { key: "where-roastery", topic: "general", question: "Where is the roastery, and can I visit?", answer: "We roast at 84 Albert Road, Woodstock, Cape Town. The roastery bar is open Monday to Friday 07:00–15:00 and Saturday 08:00–13:00, with free public cuppings every Saturday at 10:00." },
  { key: "how-fresh", topic: "general", question: "How fresh is the coffee when it arrives?", answer: "We roast to order from Monday to Thursday and ship within two working days of roasting. Every bag is stamped with its roast date." },
  { key: "wholesale", topic: "general", question: "Do you supply cafés, restaurants and offices?", answer: "Yes. We supply more than 60 wholesale partners across the Western Cape and Gauteng, including equipment, barista training and ongoing technical support. Tell us about your business on our wholesale page and Fatima will be in touch within two working days." },
  { key: "gift-cards", topic: "general", question: "Do you sell gift cards?", answer: "Digital gift cards from R200 to R2,000 are available in the shop and are delivered by email. They never expire and can be used on subscriptions too." },
  { key: "payment-methods", topic: "orders", question: "Which payment methods do you accept?", answer: "We accept Visa, Mastercard and American Express, Instant EFT, PayPal, Apple Pay and Fynbos & Fire gift cards. All payments are processed securely; we never store your card details." },
  { key: "change-order", topic: "orders", question: "Can I change or cancel my order after placing it?", answer: "If your coffee hasn't been roasted yet, yes — email hello@fynbosandfire.co.za with your order number as soon as possible. Once an order has been roasted or dispatched we can't cancel it, but you can return unopened equipment." },
  { key: "ground-coffee", topic: "orders", question: "Can you grind the coffee for me?", answer: "Yes. Choose a grind at checkout: espresso, moka pot, AeroPress, pour-over, plunger or cold brew. We recommend whole beans if you have a grinder — ground coffee goes stale much faster." },
  { key: "vat-invoice", topic: "orders", question: "Can I get a VAT invoice?", answer: "Every order confirmation email includes a VAT invoice. If you need your company name or VAT number on it, add them in the 'Company' field at checkout or email us after ordering." },
  { key: "delivery-times", topic: "shipping", question: "How long does delivery take?", answer: "Cape Town city bowl and Atlantic Seaboard orders are delivered by e-bike within one working day of dispatch. Other main centres take two to three working days, and outlying areas three to five." },
  { key: "shipping-cost", topic: "shipping", question: "How much does shipping cost?", answer: "Shipping is R80 per order nationwide and free on orders over R650. Subscriptions always ship free." },
  { key: "international", topic: "shipping", question: "Do you ship outside South Africa?", answer: "We currently ship to Namibia, Botswana, Lesotho and Eswatini. Customs duties and import VAT are the recipient's responsibility. We're working on wider international shipping.", status: "draft", live: { answer: "We currently ship within South Africa only." } },
  { key: "tracking", topic: "shipping", question: "How do I track my order?", answer: "You'll receive a tracking link by email and SMS as soon as your parcel is collected by the courier. You can also find it under Orders in your account." },
  { key: "returns-coffee", topic: "returns", question: "Can I return coffee I don't like?", answer: "Coffee is a food product, so we can't resell returned bags. But if you genuinely don't enjoy a coffee, tell us within 14 days and we'll send you a different one free of charge. We'd rather you love what you drink." },
  { key: "returns-equipment", topic: "returns", question: "What is your returns policy on equipment?", answer: "Unused equipment in its original packaging can be returned within 30 days for a full refund. Email us for a returns number; return shipping is at your cost unless the item arrived faulty." },
  { key: "damaged", topic: "returns", question: "My order arrived damaged. What now?", answer: "We're sorry! Send a photo of the damage and your order number to hello@fynbosandfire.co.za within 7 days and we'll send a replacement straight away — no need to return the damaged item." },
  { key: "storage", topic: "products", question: "How should I store my coffee?", answer: "Keep it in the resealable bag it came in, pressed flat to remove air, in a cool, dark cupboard. Don't store it in the fridge. For longer storage, freeze whole beans in airtight portions and grind straight from frozen." },
  { key: "best-before", topic: "products", question: "How long does coffee stay fresh?", answer: "Our coffee is at its best between one and six weeks after the roast date. Espresso often tastes best after ten days of resting; filter coffee from about five days." },
  { key: "decaf", topic: "products", question: "How is your decaf decaffeinated?", answer: "Our decaf uses the Swiss Water Process, which removes 99.9% of caffeine using only water, temperature and time — no chemical solvents." },
  { key: "subscription-manage", topic: "account", question: "How do I pause, skip or cancel my subscription?", answer: "Log in to your account and open Subscriptions. You can skip a delivery, change your coffee, grind or frequency, pause for up to three months, or cancel — there are no lock-ins or cancellation fees." },
  { key: "reset-password", topic: "account", question: "I've forgotten my password. How do I reset it?", answer: "Click 'Forgot password' on the login page and we'll email you a reset link, valid for one hour. If it doesn't arrive, check your spam folder or contact us." },
  { key: "delete-account", topic: "account", question: "How do I delete my account and data?", answer: "Email privacy@fynbosandfire.co.za from the address linked to your account and we'll delete your account and personal data within 30 days, as required by POPIA. Order records we must keep for tax purposes are retained for five years.", status: "queued_to_publish" },
  { key: "loyalty", topic: "account", question: "Do you have a loyalty programme?", answer: "Not yet — we're working on one for next year.", status: "not_published" }
];

const faqRecords: CmsRecord[] = faqSpecs.map((spec, index) => {
  const sortOrder = faqSpecs.slice(0, index).filter((other) => other.topic === spec.topic).length + 1;
  const values: Values = { question: spec.question, answer: spec.answer, topic: spec.topic, sortOrder };
  return seedRecord({
    id: `faq-${spec.key}`,
    publishStatus: spec.status ?? "published",
    createdAt: daysAgo(560 - index * 7),
    modifiedAt: daysAgo(spec.status ? 3 + index % 4 : 200 - index * 5),
    values,
    liveValues: spec.live ? { ...values, ...spec.live } : undefined
  });
});

export const contentSeed: SeedCollections = {
  authors: authorRecords,
  "article-categories": categoryRecords,
  articles: articleRecords,
  faqs: faqRecords
};
