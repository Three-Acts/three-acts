import { collectionRegistry } from "../registry";
import { serializeFileValue, serializeVideoValue } from "../files";
import { parseImageGallery, serializeImageGallery, serializeImageValue } from "../images";
import type { CmsRecord, CmsRecordValue, PublishStatus } from "../types";
import { productCategorySlugs, productSlugs, seedBrand } from "./keys";
import { createRandom, daysAgo, seedNow, seedRecord, type SeedCollections } from "./types";

/**
 * Shop seed for "Fynbos & Fire": a trading online coffee store with a
 * catalogue of ~65 products, ~150 customers, ~400 orders over the last 12
 * months (December peak, Black Friday spike), reviews, testimonials and the
 * discount codes those orders redeemed.
 *
 * Everything derived (customer order aggregates, discount `timesUsed`, order
 * money) is computed from the generated orders so the collections agree.
 *
 * Money model (orders): product prices are VAT-inclusive; an order's
 * `subtotal` is the ex-VAT merchandise value, `discountTotal` comes off that,
 * `taxTotal` is 15% VAT on (subtotal − discount) for ZA orders (exports are
 * zero-rated), and `total = subtotal − discount + tax + shipping`, exact to
 * the cent. Shipping is free when the discounted merchandise total incl. VAT
 * reaches R600, else R95 (ZA) / R450 flat (international), 0 for roastery
 * collection. A customer's `lifetimeValue` is the sum of totals of their
 * orders with paymentStatus "paid"; `totalOrders` counts all their orders.
 */

type Values = Record<string, CmsRecordValue>;

const DAY = 86_400_000;
const nowMs = seedNow.getTime();
const rand = createRandom(0x5eed_c0ff);

function int(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}
function chance(p: number): boolean {
  return rand() < p;
}
function weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rand() * total;
  for (const [value, w] of entries) {
    roll -= w;
    if (roll < 0) return value;
  }
  return entries[entries.length - 1][0];
}
const iso = (ms: number) => new Date(ms).toISOString();
const money = (cents: number) => Math.round(cents) / 100;

/** Fills every registry field the record didn't set with the API's normalized empty value. */
function complete(collectionId: string, values: Values): Values {
  const collection = collectionRegistry.find((c) => c.id === collectionId);
  if (!collection) throw new Error(`Unknown collection ${collectionId}`);
  const out: Values = {};
  for (const field of collection.fields) {
    const given = values[field.key];
    if (given !== undefined) {
      out[field.key] = given;
    } else if (field.type === "number") {
      out[field.key] = 0;
    } else if (field.type === "boolean") {
      out[field.key] = false;
    } else if (field.type === "image-gallery") {
      out[field.key] = "[]";
    } else {
      out[field.key] = "";
    }
  }
  for (const key of Object.keys(values)) {
    if (!(key in out)) throw new Error(`${collectionId}: unknown field "${key}"`);
  }
  return out;
}

function gallery(slug: string, title: string, count: number): string {
  return serializeImageGallery(
    Array.from({ length: count }, (_, i) => ({
      src: `https://picsum.photos/seed/${slug}-${i + 1}/1200/1200`,
      fileName: `${slug}-${i + 1}.jpg`,
      width: 1200,
      height: 1200,
      alt: i === 0 ? title : `${title} — view ${i + 1}`
    }))
  );
}

// --- Product categories ------------------------------------------------------

const categoryCopy: Record<(typeof productCategorySlugs)[number], { name: string; description: string }> = {
  "single-origin": {
    name: "Single origin",
    description: "Traceable lots from one farm, washing station or cooperative, roasted light to medium in Woodstock so the origin does the talking."
  },
  blends: {
    name: "Blends",
    description: "Year-round and seasonal blends built for consistency — our house espresso, the Table Mountain filter blend and limited seasonal releases."
  },
  decaf: {
    name: "Decaf",
    description: "Chemical-free Swiss Water and sugarcane decafs that still taste like specialty coffee. For the 3pm cup and the late-night flat white."
  },
  brewers: {
    name: "Brewers",
    description: "Pour-over drippers, immersion brewers and filters we use on the roastery brew bar every day."
  },
  grinders: {
    name: "Grinders",
    description: "Hand and electric burr grinders, tested against our own coffees. A good grinder is the single biggest upgrade to your cup."
  },
  accessories: {
    name: "Accessories",
    description: "Kettles, scales, filters and barista tools for dialling in at home."
  },
  merch: {
    name: "Merch",
    description: "Enamel mugs, tees, totes and caps from the roastery — printed in Cape Town on organic cotton."
  },
  "gift-sets": {
    name: "Gift sets",
    description: "Ready-to-gift boxes and subscriptions, wrapped in recycled kraft and shipped with a handwritten note."
  }
};

const productCategoryRecords: CmsRecord[] = productCategorySlugs.map((slug, index) =>
  seedRecord({
    id: `category-${slug}`,
    createdAt: daysAgo(520 - index * 3),
    modifiedAt: daysAgo(90 - index * 4),
    values: complete("product-categories", {
      name: categoryCopy[slug].name,
      slug,
      description: categoryCopy[slug].description,
      image: serializeImageValue({
        src: `https://picsum.photos/seed/category-${slug}/1600/900`,
        fileName: `category-${slug}.jpg`,
        width: 1600,
        height: 900,
        alt: `${categoryCopy[slug].name} at Fynbos & Fire`
      }),
      sortOrder: (index + 1) * 10
    })
  })
);

// --- Products ----------------------------------------------------------------

type Kind = "coffee" | "gear" | "merch" | "gift";
type Availability = "in_stock" | "low_stock" | "out_of_stock" | "preorder" | "discontinued";

type ProductDef = {
  slug: string;
  title: string;
  sku: string;
  category: (typeof productCategorySlugs)[number];
  kind: Kind;
  price: number;
  compareAtPrice?: number;
  inventory: number;
  availability: Availability;
  short: string;
  description: string;
  images: number;
  weight: number;
  tags: string;
  featured?: boolean;
  spec?: { fileName: string; size: number };
  video?: { fileName: string; size: number };
  /** Tasting notes, reused by review copy. */
  notes?: string[];
  /** [fromDaysAgo, toDaysAgo] the product was on sale; defaults to the whole year. */
  window?: [number, number];
  /** Relative popularity in orders. */
  popularity?: number;
  createdDaysAgo: number;
  modifiedDaysAgo?: number;
  status?: PublishStatus;
  /** For drafts of published products: the older live snapshot differs by these values. */
  liveOverrides?: Values;
};

type CoffeeOrigin = {
  origin: string;
  region: string;
  producer: string;
  varietal: string;
  process: string;
  altitude: string;
  notes: [string, string, string];
  roast: string;
  story: string;
};

function coffeeDescription(o: CoffeeOrigin): string {
  return [
    o.story,
    `Tasting notes: ${o.notes.join(", ")}.`,
    `Origin: ${o.region}, ${o.origin}. Producer: ${o.producer}. Varietal: ${o.varietal}. Process: ${o.process}. Altitude: ${o.altitude}. Roast: ${o.roast}.`,
    "Roasted to order in Woodstock, Cape Town and shipped within two working days of roasting. Rest 7–10 days for filter, 10–14 for espresso. Resealable, home-compostable valve bag."
  ].join("\n\n");
}

const origins: Record<string, CoffeeOrigin> = {
  "ethiopia-yirgacheffe-kochere": {
    origin: "Ethiopia",
    region: "Kochere, Gedeo Zone",
    producer: "smallholders delivering to the Haru washing station",
    varietal: "Heirloom (74110, 74112)",
    process: "Washed, dried on raised beds for 12 days",
    altitude: "1,900–2,200 masl",
    notes: ["jasmine", "bergamot", "white peach"],
    roast: "Light, for filter",
    story: "Our benchmark Ethiopian and the coffee that opens most of our cupping sessions. Floral and tea-like, it rewards a slow V60 and a clean kettle."
  },
  "kenya-nyeri-gatomboya": {
    origin: "Kenya",
    region: "Nyeri County",
    producer: "Gatomboya Factory, Barichu Farmers' Cooperative Society",
    varietal: "SL28, SL34, Ruiru 11",
    process: "Fully washed with double fermentation and soaking",
    altitude: "1,700–1,800 masl",
    notes: ["blackcurrant", "pink grapefruit", "demerara"],
    roast: "Light-medium, filter or espresso",
    story: "Gatomboya is the lot our roasters fight over every season: juicy, structured and loud in the best way. As a long black it tastes like cassis cordial."
  },
  "colombia-huila-la-esperanza": {
    origin: "Colombia",
    region: "Pitalito, Huila",
    producer: "the Muñoz family, Finca La Esperanza",
    varietal: "Caturra, Colombia",
    process: "Washed, 36-hour dry fermentation",
    altitude: "1,750 masl",
    notes: ["red apple", "panela", "milk chocolate"],
    roast: "Medium, omni-roast",
    story: "Third harvest with the Muñoz family and still the easiest recommendation in the shop. Sweet enough for black filter, round enough for milk."
  },
  "rwanda-huye-mountain": {
    origin: "Rwanda",
    region: "Huye District, Southern Province",
    producer: "Huye Mountain Coffee washing station (David Rubanzangabo)",
    varietal: "Red Bourbon",
    process: "Washed, hand-sorted under shade",
    altitude: "1,900–2,100 masl",
    notes: ["red grape", "hibiscus", "cane sugar"],
    roast: "Light, for filter",
    story: "A bright, winey Bourbon from one of Rwanda's most respected stations. Small allocation this year — when it's gone, it's gone until the next crop lands."
  },
  "brazil-cerrado-natural": {
    origin: "Brazil",
    region: "Cerrado Mineiro, Minas Gerais",
    producer: "Fazenda Santa Luzia",
    varietal: "Yellow Catuaí, Mundo Novo",
    process: "Natural, patio-dried",
    altitude: "1,100 masl",
    notes: ["hazelnut", "cocoa", "dried fig"],
    roast: "Medium, for espresso and moka pot",
    story: "Comfort coffee. Low acidity, heavy body and a chocolate finish that stands up to milk — the backbone of our house espresso, sold on its own."
  },
  "house-espresso-blend": {
    origin: "Brazil, Colombia & Ethiopia",
    region: "Cerrado, Huila and Sidama",
    producer: "our long-term partner farms",
    varietal: "Catuaí, Caturra, Heirloom",
    process: "Natural & washed components",
    altitude: "1,100–2,000 masl",
    notes: ["dark chocolate", "caramel", "black cherry"],
    roast: "Medium, developed for espresso",
    story: "The blend in the hopper at our Woodstock bar and in more than forty cafés across the Western Cape. Built to taste the same in March and in November."
  },
  "table-mountain-filter-blend": {
    origin: "Kenya, Colombia & Ethiopia",
    region: "Nyeri, Nariño and Guji",
    producer: "our long-term partner farms",
    varietal: "SL28, Castillo, Heirloom",
    process: "Washed",
    altitude: "1,700–2,100 masl",
    notes: ["stone fruit", "honey", "black tea"],
    roast: "Light-medium, for filter",
    story: "Our everyday filter blend: bright but forgiving, and happy in a Chemex, a batch brewer or a French press on a Sunday morning."
  },
  "swiss-water-decaf-peru": {
    origin: "Peru",
    region: "Cajamarca",
    producer: "Cooperativa Agraria Cafetalera La Prosperidad",
    varietal: "Caturra, Bourbon, Typica",
    process: "Washed, decaffeinated by the Swiss Water® process",
    altitude: "1,800 masl",
    notes: ["milk chocolate", "almond", "orange zest"],
    roast: "Medium",
    story: "99.9% caffeine-free without solvents, and good enough that our baristas drink it on purpose."
  }
};

const coreProducts: ProductDef[] = [
  {
    slug: "ethiopia-yirgacheffe-kochere",
    title: "Ethiopia Yirgacheffe Kochere",
    sku: "FF-BEAN-ETH-250",
    category: "single-origin",
    kind: "coffee",
    price: 245,
    inventory: 84,
    availability: "in_stock",
    short: "Washed heirloom from Kochere with jasmine, bergamot and white peach. 250g, roasted light for filter.",
    description: coffeeDescription(origins["ethiopia-yirgacheffe-kochere"]),
    images: 4,
    weight: 280,
    tags: "single origin, filter, floral, bestseller",
    featured: true,
    popularity: 9,
    createdDaysAgo: 480,
    modifiedDaysAgo: 21
  },
  {
    slug: "kenya-nyeri-gatomboya",
    title: "Kenya Nyeri Gatomboya AA",
    sku: "FF-BEAN-KEN-250",
    category: "single-origin",
    kind: "coffee",
    price: 295,
    inventory: 52,
    availability: "in_stock",
    short: "SL28 and SL34 from the Gatomboya factory: blackcurrant, pink grapefruit and demerara. 250g.",
    description: coffeeDescription(origins["kenya-nyeri-gatomboya"]),
    images: 3,
    weight: 280,
    tags: "single origin, filter, espresso, fruity",
    popularity: 6,
    createdDaysAgo: 450,
    modifiedDaysAgo: 2,
    // New-crop price rise drafted; the site still shows last season's R275.
    status: "draft",
    liveOverrides: { price: 275 }
  },
  {
    slug: "colombia-huila-la-esperanza",
    title: "Colombia Huila La Esperanza",
    sku: "FF-BEAN-COL-250",
    category: "single-origin",
    kind: "coffee",
    price: 225,
    inventory: 130,
    availability: "in_stock",
    short: "A sweet, balanced washed Caturra from the Muñoz family — red apple, panela and milk chocolate. 250g.",
    description: coffeeDescription(origins["colombia-huila-la-esperanza"]),
    images: 3,
    weight: 280,
    tags: "single origin, omni roast, chocolate, bestseller",
    featured: true,
    popularity: 8,
    createdDaysAgo: 470,
    modifiedDaysAgo: 30
  },
  {
    slug: "rwanda-huye-mountain",
    title: "Rwanda Huye Mountain",
    sku: "FF-BEAN-RWA-250",
    category: "single-origin",
    kind: "coffee",
    price: 235,
    inventory: 6,
    availability: "low_stock",
    short: "Red Bourbon from Huye Mountain with red grape, hibiscus and cane sugar. Last bags of this crop. 250g.",
    description: coffeeDescription(origins["rwanda-huye-mountain"]),
    images: 2,
    weight: 280,
    tags: "single origin, filter, limited",
    popularity: 4,
    createdDaysAgo: 300,
    modifiedDaysAgo: 5
  },
  {
    slug: "brazil-cerrado-natural",
    title: "Brazil Cerrado Natural",
    sku: "FF-BEAN-BRA-250",
    category: "single-origin",
    kind: "coffee",
    price: 185,
    compareAtPrice: 210,
    inventory: 160,
    availability: "in_stock",
    short: "Natural Catuaí from Fazenda Santa Luzia — hazelnut, cocoa and dried fig. On sale while we clear the last container. 250g.",
    description: coffeeDescription(origins["brazil-cerrado-natural"]),
    images: 3,
    weight: 280,
    tags: "single origin, espresso, moka pot, sale",
    popularity: 6,
    createdDaysAgo: 460,
    modifiedDaysAgo: 14
  },
  {
    slug: "house-espresso-blend",
    title: "House Espresso Blend",
    sku: "FF-BEAN-HSE-250",
    category: "blends",
    kind: "coffee",
    price: 195,
    inventory: 240,
    availability: "in_stock",
    short: "The blend in our Woodstock hopper: dark chocolate, caramel and black cherry. Built for milk. 250g.",
    description: coffeeDescription(origins["house-espresso-blend"]),
    images: 4,
    weight: 280,
    tags: "blend, espresso, milk, bestseller",
    featured: true,
    popularity: 14,
    createdDaysAgo: 520,
    modifiedDaysAgo: 40
  },
  {
    slug: "table-mountain-filter-blend",
    title: "Table Mountain Filter Blend",
    sku: "FF-BEAN-TMB-250",
    category: "blends",
    kind: "coffee",
    price: 210,
    inventory: 118,
    availability: "in_stock",
    short: "Our everyday filter blend of Kenya, Colombia and Ethiopia — stone fruit, honey and black tea. 250g.",
    description: coffeeDescription(origins["table-mountain-filter-blend"]),
    images: 3,
    weight: 280,
    tags: "blend, filter, batch brew",
    popularity: 9,
    createdDaysAgo: 510,
    modifiedDaysAgo: 60
  },
  {
    slug: "swiss-water-decaf-peru",
    title: "Swiss Water Decaf — Peru Cajamarca",
    sku: "FF-BEAN-DEC-250",
    category: "decaf",
    kind: "coffee",
    price: 215,
    inventory: 64,
    availability: "in_stock",
    short: "Solvent-free Swiss Water decaf from Cajamarca: milk chocolate, almond and orange zest. 250g.",
    description: coffeeDescription(origins["swiss-water-decaf-peru"]),
    images: 2,
    weight: 280,
    tags: "decaf, swiss water, espresso, filter",
    popularity: 4,
    createdDaysAgo: 440,
    modifiedDaysAgo: 75
  },
  {
    slug: "v60-ceramic-dripper",
    title: "Hario V60 02 Ceramic Dripper — White",
    sku: "FF-GEAR-V60-02",
    category: "brewers",
    kind: "gear",
    price: 420,
    inventory: 38,
    availability: "in_stock",
    short: "The classic cone dripper in Arita-fired porcelain. Brews 1–4 cups; holds heat better than plastic.",
    description:
      "Hario's V60 is the dripper on our brew bar and the one we teach every pour-over class with. The spiral ribs and single large hole let you control the flow with your pour.\n\nSize 02 (1–4 cups). Arita porcelain, made in Japan. Uses V60 02 paper filters (sold separately). Dishwasher safe.\n\nDimensions: 137 × 116 × 102 mm. Weight: 390 g.",
    images: 4,
    weight: 520,
    tags: "pour over, hario, gift, bestseller",
    popularity: 5,
    createdDaysAgo: 500,
    modifiedDaysAgo: 120
  },
  {
    slug: "chemex-six-cup",
    title: "Chemex Classic 6-Cup",
    sku: "FF-GEAR-CHX-6",
    category: "brewers",
    kind: "gear",
    price: 1150,
    inventory: 0,
    availability: "out_of_stock",
    short: "The hand-blown borosilicate icon with wood collar and leather tie. Makes up to 900 ml. Restock due in October.",
    description:
      "Designed in 1941 and still one of the cleanest cups you can brew. The thick bonded filters strip out oils and fines for a crisp, tea-like cup — perfect for our washed African coffees.\n\nCapacity: 900 ml (6 × 150 ml cups). Borosilicate glass, polished wood collar, leather tie. Hand wash only.\n\nUse Chemex bonded filters FS-100 (sold separately).",
    images: 3,
    weight: 950,
    tags: "pour over, chemex, glass, gift",
    popularity: 3,
    createdDaysAgo: 500,
    modifiedDaysAgo: 9
  },
  {
    slug: "aeropress-go",
    title: "AeroPress Go Travel Coffee Press",
    sku: "FF-GEAR-AP-GO",
    category: "brewers",
    kind: "gear",
    price: 895,
    inventory: 46,
    availability: "in_stock",
    short: "The whole AeroPress kit packed inside its own 450 ml mug. Espresso-style or filter coffee anywhere — from the office to the Cederberg.",
    description:
      "Everything packs into the included mug: press, scoop, stirrer, filter cap and 350 micro-filters. Brews one to three cups in about a minute, and cleans itself as you plunge.\n\nMaterials: BPA-free polypropylene, silicone seal. Mug capacity: 450 ml. Includes 350 paper filters.\n\nOur recipe: 15 g medium-fine, 220 g water at 90 °C, stir, cap, invert at 1:15, press slowly.",
    images: 5,
    weight: 420,
    tags: "aeropress, travel, camping, gift, bestseller",
    featured: true,
    video: { fileName: "aeropress-go-recipe.mp4", size: 18_450_112 },
    popularity: 6,
    createdDaysAgo: 490,
    modifiedDaysAgo: 33
  },
  {
    slug: "comandante-c40-grinder",
    title: "Comandante C40 MK4 Nitro Blade Hand Grinder",
    sku: "FF-GRND-C40",
    category: "grinders",
    kind: "gear",
    price: 7250,
    inventory: 11,
    availability: "in_stock",
    short: "The reference hand grinder: high-nitrogen steel burrs, 39 mm conical, grinds everything from Turkish to cold brew.",
    description:
      "Made in Germany and still the hand grinder we measure everything against. The Nitro Blade burrs are exceptionally consistent at filter sizes and have the range for espresso.\n\nBurrs: 39 mm conical, high-nitrogen martensitic steel. Capacity: 40 g beans. Clicks: 12 per rotation (~30 µm per click). Body: American black walnut veneer, glass jars.\n\nIn the box: grinder, two jars (glass and polymer), cleaning brush. Two-year warranty through Fynbos & Fire.",
    images: 6,
    weight: 780,
    tags: "hand grinder, espresso, filter, premium",
    featured: true,
    spec: { fileName: "comandante-c40-mk4-spec-sheet.pdf", size: 842_311 },
    popularity: 2,
    createdDaysAgo: 470,
    modifiedDaysAgo: 1,
    // Importer price increase and updated burr copy drafted; the site still sells at R6,950.
    status: "draft",
    liveOverrides: { price: 6950 }
  },
  {
    slug: "baratza-encore-esp",
    title: "Baratza Encore ESP Electric Grinder",
    sku: "FF-GRND-ENC-ESP",
    category: "grinders",
    kind: "gear",
    price: 5499,
    inventory: 0,
    availability: "preorder",
    short: "An entry-level electric burr grinder that finally does espresso properly. Pre-order: next shipment ships mid-September.",
    description:
      "The Encore ESP adds a dedicated espresso range (20 micro-steps) to the much-loved Encore, while still grinding coarse enough for French press.\n\nBurrs: 40 mm M2 conical steel. 40 settings (1–20 espresso micro-adjust, 21–40 filter). Hopper: 250 g. Power: 220–240 V, SA plug.\n\nPre-orders are charged now and ship in order of purchase.",
    images: 4,
    weight: 3200,
    tags: "electric grinder, espresso, pre-order",
    spec: { fileName: "baratza-encore-esp-spec-sheet.pdf", size: 1_204_880 },
    popularity: 2,
    createdDaysAgo: 330,
    modifiedDaysAgo: 6
  },
  {
    slug: "gooseneck-kettle-900ml",
    title: "Pour-Over Gooseneck Kettle 900 ml",
    sku: "FF-ACC-KETTLE-900",
    category: "accessories",
    kind: "gear",
    price: 1250,
    compareAtPrice: 1450,
    inventory: 27,
    availability: "in_stock",
    short: "A brushed stainless stovetop gooseneck with a thermometer in the lid. Works on gas, electric and induction.",
    description:
      "A narrow spout for a slow, even pour and a built-in dial thermometer so you know when you're at 92 °C.\n\nCapacity: 900 ml (600 ml recommended fill). 304 stainless steel, induction-compatible base. Heat-resistant handle.",
    images: 3,
    weight: 740,
    tags: "kettle, pour over, induction, sale",
    popularity: 3,
    createdDaysAgo: 420,
    modifiedDaysAgo: 18
  },
  {
    slug: "digital-brew-scale",
    title: "Digital Brew Scale with Timer",
    sku: "FF-ACC-SCALE",
    category: "accessories",
    kind: "gear",
    price: 1099,
    inventory: 44,
    availability: "in_stock",
    short: "0.1 g resolution, a built-in timer and a USB-C battery. Weigh your dose and your pour.",
    description:
      "Accurate to 0.1 g up to 2 kg, with a flow-rate readout and auto-start timer for pour-over and espresso.\n\nPlatform: 150 × 150 mm, heat-resistant silicone pad. Battery: 1,600 mAh rechargeable (USB-C), ~30 hours. Water-resistant (IPX4).",
    images: 3,
    weight: 460,
    tags: "scale, espresso, pour over",
    spec: { fileName: "digital-brew-scale-manual.pdf", size: 356_902 },
    popularity: 3,
    createdDaysAgo: 400,
    modifiedDaysAgo: 50
  },
  {
    slug: "enamel-camp-mug",
    title: "Enamel Camp Mug — Speckled Cream",
    sku: "FF-MERCH-MUG-CRM",
    category: "merch",
    kind: "merch",
    price: 245,
    inventory: 90,
    availability: "in_stock",
    short: "A 350 ml speckled enamel mug with our fire-and-protea mark. Campfire-proof, dishwasher-safe.",
    description:
      "Enamel on steel, finished with a rolled stainless rim. Holds 350 ml — a flat white with room to spare.\n\nPrinted in Cape Town. Dishwasher safe; not for the microwave.",
    images: 2,
    weight: 300,
    tags: "mug, merch, camping, gift",
    popularity: 4,
    createdDaysAgo: 380,
    modifiedDaysAgo: 100
  },
  {
    slug: "roastery-tote-bag",
    title: "Roastery Tote Bag — Natural",
    sku: "FF-MERCH-TOTE-NAT",
    category: "merch",
    kind: "merch",
    price: 195,
    inventory: 120,
    availability: "in_stock",
    short: "Heavy 12 oz organic cotton canvas with a gusset big enough for four bags of coffee and a baguette.",
    description:
      "Screen-printed by hand in Salt River. 38 × 42 × 10 cm with 65 cm handles and an inside pocket.\n\n100% organic cotton canvas. Cold wash, line dry.",
    images: 2,
    weight: 220,
    tags: "tote, merch, organic cotton",
    popularity: 2,
    createdDaysAgo: 370,
    modifiedDaysAgo: 140
  },
  {
    slug: "brew-at-home-gift-set",
    title: "Brew at Home Gift Set",
    sku: "FF-GIFT-BREW-HOME",
    category: "gift-sets",
    kind: "gift",
    price: 1095,
    compareAtPrice: 1215,
    inventory: 35,
    availability: "in_stock",
    short: "Everything to start brewing pour-over: a V60, 100 filters, 250g of Table Mountain Filter Blend and an enamel mug.",
    description:
      "Our most-gifted box. Includes a Hario V60 02 ceramic dripper, 100 V60 paper filters, 250 g Table Mountain Filter Blend (ground or whole bean — tell us at checkout) and an Enamel Camp Mug.\n\nPacked in a recycled kraft box with a printed brew guide and a handwritten note if you add one.",
    images: 4,
    weight: 1250,
    tags: "gift, pour over, starter kit, bestseller",
    featured: true,
    popularity: 4,
    createdDaysAgo: 400,
    modifiedDaysAgo: 25
  }
];

const kiloStock = [22, 14, 30, 0, 40, 85, 36, 12];

/** 1 kg bags of every core coffee (café and heavy-home-user size). */
const kiloBags: ProductDef[] = coreProducts
  .filter((p) => p.kind === "coffee")
  .map((p, index): ProductDef => {
    const price = Math.round((p.price * 3.4) / 5) * 5;
    return {
      slug: `${p.slug}-1kg`,
      title: `${p.title} — 1kg`,
      sku: p.sku.replace(/-250$/, "-1KG"),
      category: p.category,
      kind: "coffee",
      price,
      inventory: kiloStock[index],
      availability: kiloStock[index] === 0 ? "out_of_stock" : kiloStock[index] <= 12 ? "low_stock" : "in_stock",
      short: `${p.title} in a 1kg bag — for cafés, offices and households that go through a bag a week. Same roast, better value per cup.`,
      description: `${origins[p.slug].story}\n\nTasting notes: ${origins[p.slug].notes.join(", ")}.\n\n1 kg, whole bean only. Roasted to order and packed in a resealable valve bag. Wholesale pricing available for regular café orders.`,
      images: 2,
      weight: 1080,
      tags: `${p.tags.replace(", bestseller", "")}, 1kg, wholesale`,
      notes: origins[p.slug].notes,
      popularity: p.slug === "house-espresso-blend" ? 6 : 1.5,
      createdDaysAgo: p.createdDaysAgo - 20,
      modifiedDaysAgo: 30 + index * 3
    };
  });

function microLot(input: {
  slug: string;
  title: string;
  sku: string;
  price: number;
  inventory: number;
  availability: Availability;
  o: CoffeeOrigin;
  weight?: number;
  size?: string;
  createdDaysAgo: number;
  status?: PublishStatus;
  featured?: boolean;
}): ProductDef {
  return {
    slug: input.slug,
    title: input.title,
    sku: input.sku,
    category: "single-origin",
    kind: "coffee",
    price: input.price,
    inventory: input.inventory,
    availability: input.availability,
    short: `Limited micro-lot: ${input.o.notes.join(", ")}. ${input.o.process}, ${input.o.varietal}. ${input.size ?? "250g"}.`,
    description: coffeeDescription(input.o),
    images: 3,
    weight: input.weight ?? 280,
    tags: "single origin, micro-lot, limited, filter",
    featured: input.featured,
    notes: input.o.notes,
    window: [Math.max(input.createdDaysAgo - 5, 0), 0],
    popularity: 1.2,
    createdDaysAgo: input.createdDaysAgo,
    modifiedDaysAgo: Math.max(input.createdDaysAgo - 10, 1),
    status: input.status
  };
}

const microLots: ProductDef[] = [
  microLot({
    slug: "panama-boquete-geisha",
    title: "Panama Boquete Geisha — 100g Tin",
    sku: "FF-BEAN-PAN-GSH-100",
    price: 395,
    inventory: 18,
    availability: "in_stock",
    size: "100g tin",
    weight: 160,
    createdDaysAgo: 110,
    featured: true,
    o: {
      origin: "Panama",
      region: "Boquete, Chiriquí",
      producer: "Finca Lérida",
      varietal: "Geisha",
      process: "Washed",
      altitude: "1,650 masl",
      notes: ["orange blossom", "mango", "earl grey"],
      roast: "Very light",
      story: "Our first Geisha: delicate, perfumed and gone every time we restock. Brew it gently and drink it black."
    }
  }),
  microLot({
    slug: "ethiopia-guji-hambela-anaerobic",
    title: "Ethiopia Guji Hambela Anaerobic Natural",
    sku: "FF-BEAN-ETH-HMB-250",
    price: 365,
    inventory: 60,
    availability: "preorder",
    createdDaysAgo: 12,
    status: "queued_to_publish",
    o: {
      origin: "Ethiopia",
      region: "Hambela Wamena, Guji",
      producer: "the Buku Abel washing station",
      varietal: "Heirloom (74158)",
      process: "Anaerobic natural, 96-hour sealed fermentation",
      altitude: "2,150–2,300 masl",
      notes: ["strawberry jam", "cacao nib", "rum and raisin"],
      roast: "Light",
      story: "A wild, boozy anaerobic natural landing for spring. Launches with the September release — pre-order to be first in line."
    }
  }),
  microLot({
    slug: "colombia-cauca-el-paraiso-lychee",
    title: "Café de Colombia · Finca El Paraíso “Lychee” Thermal-Shock Double-Anaerobic Castillo — Competition Series Micro-Lot Nº 3 (Limited Release, 150g)",
    sku: "FF-BEAN-COL-PAR-150",
    price: 420,
    inventory: 9,
    availability: "low_stock",
    size: "150g",
    weight: 190,
    createdDaysAgo: 95,
    o: {
      origin: "Colombia",
      region: "Piendamó, Cauca",
      producer: "Diego Bermúdez, Finca El Paraíso",
      varietal: "Castillo",
      process: "Double anaerobic with thermal shock",
      altitude: "1,930 masl",
      notes: ["lychee", "rose water", "raspberry"],
      roast: "Very light",
      story: "Diego Bermúdez's experimental processing produces a cup that barely tastes like coffee — in the most exciting way. A competition lot, and a conversation starter."
    }
  }),
  microLot({
    slug: "costa-rica-tarrazu-honey",
    title: "Costa Rica Tarrazú Yellow Honey",
    sku: "FF-BEAN-CRI-250",
    price: 310,
    inventory: 24,
    availability: "in_stock",
    createdDaysAgo: 140,
    o: {
      origin: "Costa Rica",
      region: "Tarrazú, San José",
      producer: "Don Mayo micromill",
      varietal: "Caturra, Catuaí",
      process: "Yellow honey",
      altitude: "1,800 masl",
      notes: ["apricot", "brown butter", "orange marmalade"],
      roast: "Light-medium",
      story: "Honey processing leaves some fruit on the bean while it dries, and this lot shows it: syrupy, sweet and bright."
    }
  }),
  microLot({
    slug: "burundi-kayanza-red-honey",
    title: "Burundi Kayanza Red Honey",
    sku: "FF-BEAN-BDI-250",
    price: 295,
    inventory: 0,
    availability: "out_of_stock",
    createdDaysAgo: 210,
    o: {
      origin: "Burundi",
      region: "Kayanza Province",
      producer: "Ninga washing station",
      varietal: "Red Bourbon",
      process: "Red honey",
      altitude: "1,850 masl",
      notes: ["cranberry", "black tea", "molasses"],
      roast: "Light",
      story: "Sold out for the season. We'll be back at Ninga for the next crop — sign up for restock alerts."
    }
  }),
  microLot({
    slug: "guatemala-huehuetenango-el-injerto",
    title: "Guatemala Huehuetenango El Injerto",
    sku: "FF-BEAN-GTM-250",
    price: 285,
    inventory: 32,
    availability: "in_stock",
    createdDaysAgo: 160,
    o: {
      origin: "Guatemala",
      region: "La Libertad, Huehuetenango",
      producer: "Finca El Injerto (the Aguirre family)",
      varietal: "Bourbon, Pacamara",
      process: "Washed",
      altitude: "1,750–1,900 masl",
      notes: ["toffee", "green apple", "cinnamon"],
      roast: "Medium",
      story: "A classic, clean Guatemalan from a farm that's been setting the standard for four generations."
    }
  }),
  microLot({
    slug: "yemen-haraaz-mocha",
    title: "Yemen Haraaz Mocha",
    sku: "FF-BEAN-YEM-250",
    price: 420,
    inventory: 4,
    availability: "low_stock",
    createdDaysAgo: 80,
    o: {
      origin: "Yemen",
      region: "Haraaz, Sana'a Governorate",
      producer: "smallholder terraces via Qima Coffee",
      varietal: "Yemenia (Udaini, Dawairi)",
      process: "Natural, dried on rooftops",
      altitude: "2,000–2,400 masl",
      notes: ["dried apricot", "spice", "dark chocolate"],
      roast: "Medium",
      story: "Coffee from where it all began: ancient terraces, tiny yields and a cup that tastes like a spice market."
    }
  }),
  microLot({
    slug: "kenya-kirinyaga-peaberry",
    title: "Kenya Kirinyaga Karimikui Peaberry",
    sku: "FF-BEAN-KEN-PB-250",
    price: 320,
    inventory: 15,
    availability: "in_stock",
    createdDaysAgo: 70,
    o: {
      origin: "Kenya",
      region: "Kirinyaga County",
      producer: "Karimikui Factory, Rungeto FCS",
      varietal: "SL28, SL34",
      process: "Fully washed",
      altitude: "1,650–1,800 masl",
      notes: ["redcurrant", "lime", "cola"],
      roast: "Light",
      story: "Peaberries are single round beans that roast beautifully evenly. This one is sparkling and sweet."
    }
  })
];

function seasonalBlend(input: {
  slug: string;
  title: string;
  sku: string;
  price: number;
  inventory: number;
  availability: Availability;
  notes: [string, string, string];
  story: string;
  window: [number, number];
  createdDaysAgo: number;
  compareAtPrice?: number;
}): ProductDef {
  return {
    slug: input.slug,
    title: input.title,
    sku: input.sku,
    category: "blends",
    kind: "coffee",
    price: input.price,
    compareAtPrice: input.compareAtPrice,
    inventory: input.inventory,
    availability: input.availability,
    short: `Seasonal blend: ${input.notes.join(", ")}. 250g, available for a limited time.`,
    description: `${input.story}\n\nTasting notes: ${input.notes.join(", ")}.\n\nRoasted to order in Woodstock, Cape Town. 250 g whole bean or ground to order.`,
    images: 2,
    weight: 280,
    tags: "blend, seasonal, limited",
    notes: input.notes,
    window: input.window,
    popularity: 3,
    createdDaysAgo: input.createdDaysAgo,
    modifiedDaysAgo: Math.max(input.window[1], 3)
  };
}

const seasonalBlends: ProductDef[] = [
  seasonalBlend({
    slug: "winter-solstice-blend",
    title: "Winter Solstice Blend",
    sku: "FF-BEAN-WSB-250",
    price: 215,
    inventory: 8,
    availability: "low_stock",
    notes: ["dark chocolate", "orange peel", "clove"],
    story: "Our winter warmer — heavier, spicier and made for Cape storms, moka pots and rusks.",
    window: [110, 0],
    createdDaysAgo: 115
  }),
  seasonalBlend({
    slug: "festive-christmas-blend",
    title: "Festive Christmas Blend",
    sku: "FF-BEAN-XMS-250",
    price: 199,
    compareAtPrice: 229,
    inventory: 0,
    availability: "out_of_stock",
    notes: ["mince pie", "cherry", "cocoa"],
    story: "The December blend in the red bag. Back in November — last year it sold out by the 20th.",
    window: [300, 240],
    createdDaysAgo: 305
  }),
  seasonalBlend({
    slug: "heritage-day-braai-blend",
    title: "Heritage Day Braai Blend",
    sku: "FF-BEAN-HDB-250",
    price: 205,
    inventory: 120,
    availability: "preorder",
    notes: ["smoky caramel", "roasted pecan", "treacle"],
    story: "A bold, smoky-sweet blend for the fire on the 24th. Pre-orders ship the week before Heritage Day.",
    window: [18, 0],
    createdDaysAgo: 22
  }),
  seasonalBlend({
    slug: "summer-cold-brew-blend",
    title: "Summer Cold Brew Blend",
    sku: "FF-BEAN-SCB-250",
    price: 199,
    inventory: 70,
    availability: "in_stock",
    notes: ["milk chocolate", "stone fruit", "brown sugar"],
    story: "Coarse-ground for cold brew and chosen to stay sweet and low-acid over a long steep. 100 g to 1 litre, 16 hours in the fridge.",
    window: [300, 150],
    createdDaysAgo: 310
  }),
  seasonalBlend({
    slug: "spring-fynbos-blend",
    title: "Spring Fynbos Blend",
    sku: "FF-BEAN-SPB-250",
    price: 210,
    inventory: 55,
    availability: "in_stock",
    notes: ["honeysuckle", "nectarine", "rooibos"],
    story: "Light and floral for the first warm weekends — the fynbos is in flower and so is this blend.",
    window: [365, 330],
    createdDaysAgo: 380
  })
];

const extraDecafs: ProductDef[] = [
  {
    slug: "colombia-sugarcane-decaf",
    title: "Colombia Sugarcane Decaf",
    sku: "FF-BEAN-DEC-COL-250",
    category: "decaf",
    kind: "coffee",
    price: 225,
    inventory: 40,
    availability: "in_stock",
    short: "Decaffeinated with ethyl acetate from local sugarcane — naturally sweet, with red apple and caramel. 250g.",
    description:
      "Sugarcane (EA) decaf keeps more of the bean's sweetness than any other method we've tried.\n\nTasting notes: red apple, caramel, cocoa.\n\nOrigin: Tolima, Colombia. Varietal: Castillo, Caturra. Roast: Medium.",
    images: 2,
    weight: 280,
    tags: "decaf, sugarcane, espresso",
    notes: ["red apple", "caramel", "cocoa"],
    popularity: 2,
    createdDaysAgo: 200,
    modifiedDaysAgo: 60
  },
  {
    slug: "mexico-mountain-water-decaf",
    title: "Mexico Mountain Water Decaf",
    sku: "FF-BEAN-DEC-MEX-250",
    category: "decaf",
    kind: "coffee",
    price: 230,
    inventory: 26,
    availability: "in_stock",
    short: "Chiapas coffee decaffeinated with glacier water from Pico de Orizaba — nutty and gentle. 250g.",
    description:
      "Mountain Water process decaf with a soft, nutty cup — our pick for a late-night French press.\n\nTasting notes: walnut, milk chocolate, raisin.\n\nOrigin: Chiapas, Mexico. Roast: Medium.",
    images: 2,
    weight: 280,
    tags: "decaf, mountain water, french press",
    notes: ["walnut", "milk chocolate", "raisin"],
    popularity: 1.5,
    createdDaysAgo: 180,
    modifiedDaysAgo: 45
  }
];

function merch(slug: string, title: string, sku: string, price: number, inventory: number, short: string, description: string, weight: number, tags: string, createdDaysAgo: number): ProductDef {
  return {
    slug,
    title,
    sku,
    category: "merch",
    kind: "merch",
    price,
    inventory,
    availability: inventory === 0 ? "out_of_stock" : inventory <= 10 ? "low_stock" : "in_stock",
    short,
    description,
    images: 2,
    weight,
    tags,
    popularity: 1,
    createdDaysAgo,
    modifiedDaysAgo: Math.max(createdDaysAgo - 30, 4)
  };
}

const mugCopy = "Enamel on steel with a rolled stainless rim. 350 ml. Printed in Cape Town. Dishwasher safe; not for the microwave.";
const teeCopy = "220 gsm organic cotton, garment-dyed and screen-printed in Salt River. Relaxed unisex fit — size down for a closer fit. Sizes XS–XXL.";

const merchVariants: ProductDef[] = [
  merch("enamel-camp-mug-protea-pink", "Enamel Camp Mug — Protea Pink", "FF-MERCH-MUG-PNK", 245, 64, "Our 350 ml enamel camp mug in protea pink.", mugCopy, 300, "mug, merch, gift", 300),
  merch("enamel-camp-mug-fynbos-green", "Enamel Camp Mug — Fynbos Green", "FF-MERCH-MUG-GRN", 245, 7, "Our 350 ml enamel camp mug in deep fynbos green.", mugCopy, 300, "mug, merch, gift", 300),
  merch("enamel-camp-mug-midnight", "Enamel Camp Mug — Midnight", "FF-MERCH-MUG-MID", 245, 48, "Our 350 ml enamel camp mug in midnight blue with a cream rim.", mugCopy, 300, "mug, merch, gift", 240),
  merch("roastery-tote-bag-black", "Roastery Tote Bag — Black", "FF-MERCH-TOTE-BLK", 195, 55, "The roastery tote in black canvas with a cream print.", "Heavy 12 oz organic cotton canvas, 38 × 42 × 10 cm, inside pocket. Screen-printed in Salt River.", 220, "tote, merch", 200),
  merch("logo-tee-bone", "Fynbos & Fire Logo Tee — Bone", "FF-MERCH-TEE-BON", 395, 42, "A heavyweight organic tee with a small chest mark and a big back print.", teeCopy, 260, "t-shirt, merch, organic cotton", 260),
  merch("logo-tee-charcoal", "Fynbos & Fire Logo Tee — Charcoal", "FF-MERCH-TEE-CHR", 395, 36, "A heavyweight organic tee in charcoal.", teeCopy, 260, "t-shirt, merch, organic cotton", 260),
  merch("logo-tee-olive", "Fynbos & Fire Logo Tee — Olive", "FF-MERCH-TEE-OLV", 395, 0, "A heavyweight organic tee in olive. Restocking soon.", teeCopy, 260, "t-shirt, merch, organic cotton", 150),
  merch("roasters-beanie-rust", "Roaster's Beanie — Rust", "FF-MERCH-BEANIE-RST", 295, 30, "A chunky rib-knit merino-blend beanie for early roast shifts.", "70% merino, 30% recycled nylon. One size. Knitted in Johannesburg.", 110, "beanie, merch, winter", 120),
  merch("dad-cap-sand", "Dad Cap — Sand", "FF-MERCH-CAP-SND", 325, 25, "A washed cotton six-panel cap with an embroidered flame.", "100% cotton twill, brass buckle strap. One size.", 90, "cap, merch", 220),
  merch("barista-apron-waxed-canvas", "Barista Apron — Waxed Canvas", "FF-MERCH-APRON", 895, 12, "The apron our baristas wear: waxed canvas, leather straps, cross-back.", "Waxed 14 oz cotton canvas, vegetable-tanned leather straps, two front pockets and a pen slot. Wipe clean. Made in Cape Town.", 650, "apron, barista, merch, gift", 280)
];

function gear(p: Omit<ProductDef, "kind" | "popularity" | "modifiedDaysAgo"> & { popularity?: number; modifiedDaysAgo?: number }): ProductDef {
  return { popularity: 1.2, modifiedDaysAgo: Math.max(p.createdDaysAgo - 60, 3), ...p, kind: "gear" };
}

const gearVariants: ProductDef[] = [
  gear({
    slug: "hario-switch-03",
    title: "Hario Switch 03 Immersion Dripper",
    sku: "FF-GEAR-SWITCH-03",
    category: "brewers",
    price: 690,
    inventory: 21,
    availability: "in_stock",
    short: "A V60 with a valve: steep like a French press, then release. The most forgiving pour-over there is.",
    description: "Heat-resistant glass cone on a silicone valve base. Size 03 (1–5 cups). Uses V60 03 filters.\n\nOur recipe: 20 g medium, 320 g water, close, steep 2:30, open.",
    images: 3,
    weight: 480,
    tags: "hario, immersion, pour over",
    createdDaysAgo: 360
  }),
  gear({
    slug: "kalita-wave-185-stainless",
    title: "Kalita Wave 185 Stainless Dripper",
    sku: "FF-GEAR-KALITA-185",
    category: "brewers",
    price: 650,
    inventory: 13,
    availability: "in_stock",
    short: "A flat-bed dripper with three small holes for even, consistent extraction. Stainless steel, unbreakable.",
    description: "18-8 stainless steel. Size 185 (2–4 cups). Uses Kalita Wave 185 filters.\n\nThe flat bed makes it very forgiving of pour technique — a great first dripper.",
    images: 3,
    weight: 300,
    tags: "kalita, pour over, travel",
    createdDaysAgo: 340
  }),
  gear({
    slug: "v60-paper-filters-02",
    title: "Hario V60 02 Paper Filters — 100 Pack",
    sku: "FF-ACC-V60-FLT-02",
    category: "accessories",
    price: 95,
    inventory: 400,
    availability: "in_stock",
    short: "Genuine Hario tabbed filters for the V60 02. White, oxygen-bleached, 100 per box.",
    description: "Fits Hario V60 size 02 drippers. Rinse with hot water before brewing to remove any paper taste.",
    images: 1,
    weight: 120,
    tags: "filters, v60, consumables",
    popularity: 5,
    createdDaysAgo: 500
  }),
  gear({
    slug: "chemex-bonded-filters",
    title: "Chemex Bonded Filters FS-100 — 100 Pack",
    sku: "FF-ACC-CHX-FLT",
    category: "accessories",
    price: 249,
    inventory: 88,
    availability: "in_stock",
    short: "Pre-folded square filters for 6, 8 and 10-cup Chemex brewers.",
    description: "20–30% heavier than other filters for a clean, sediment-free cup. 100 pre-folded squares.",
    images: 1,
    weight: 400,
    tags: "filters, chemex, consumables",
    popularity: 2,
    createdDaysAgo: 500
  }),
  gear({
    slug: "fellow-ode-gen-2",
    title: "Fellow Ode Brew Grinder Gen 2",
    sku: "FF-GRND-ODE-2",
    category: "grinders",
    price: 6800,
    inventory: 5,
    availability: "low_stock",
    short: "A beautiful single-dose flat-burr grinder built for filter coffee. 64 mm burrs, 31 settings.",
    description: "Gen 2 Brew Burrs are tuned for pour-over, AeroPress and French press — not espresso.\n\nBurrs: 64 mm flat, stainless. Settings: 31 (with 11 in-between steps). Capacity: 100 g single dose. Power: 220–240 V.",
    images: 4,
    weight: 4500,
    tags: "electric grinder, filter, premium",
    spec: { fileName: "fellow-ode-gen-2-spec-sheet.pdf", size: 1_910_224 },
    createdDaysAgo: 260
  }),
  gear({
    slug: "1zpresso-j-max",
    title: "1Zpresso J-Max Hand Grinder",
    sku: "FF-GRND-1Z-JMAX",
    category: "grinders",
    price: 4200,
    inventory: 14,
    availability: "in_stock",
    short: "A hand grinder with 8.8 µm clicks for dialling in espresso precisely. 48 mm stainless burrs.",
    description: "Burrs: 48 mm conical, heptagonal stainless. Clicks: 90 per rotation. Capacity: 35–40 g. Magnetic catch cup.\n\nIncludes travel case, cleaning brush and air blower.",
    images: 4,
    weight: 790,
    tags: "hand grinder, espresso",
    spec: { fileName: "1zpresso-j-max-spec-sheet.pdf", size: 640_118 },
    createdDaysAgo: 290
  }),
  gear({
    slug: "niche-zero-grinder",
    title: "Niche Zero Single-Dose Grinder — Black",
    sku: "FF-GRND-NICHE-ZERO",
    category: "grinders",
    price: 9450,
    inventory: 0,
    availability: "preorder",
    short: "The single-dose conical grinder that changed home espresso. 63 mm Mazzer burrs, near-zero retention.",
    description: "Burrs: 63 mm conical (Mazzer Kony). Retention: under 0.1 g. Stepless adjustment from espresso to French press. Power: 220–240 V, SA plug.\n\nPre-order: next allocation arrives from the UK in October.",
    images: 5,
    weight: 6200,
    tags: "electric grinder, espresso, premium, pre-order",
    spec: { fileName: "niche-zero-spec-sheet.pdf", size: 2_311_560 },
    popularity: 0.6,
    createdDaysAgo: 230
  }),
  gear({
    slug: "timemore-c3-grinder",
    title: "Timemore Chestnut C3 Hand Grinder",
    sku: "FF-GRND-TM-C3",
    category: "grinders",
    price: 1850,
    inventory: 0,
    availability: "discontinued",
    short: "A great-value hand grinder with S2C steel burrs. Replaced in our range by the 1Zpresso J-Max.",
    description: "Burrs: 38 mm S2C stainless. Aluminium body. Capacity: 25 g.\n\nDiscontinued: we no longer stock the C3. Spare parts are still available on request.",
    images: 3,
    weight: 530,
    tags: "hand grinder, entry level",
    popularity: 2,
    window: [365, 150],
    status: "not_published",
    createdDaysAgo: 480,
    modifiedDaysAgo: 145
  }),
  gear({
    slug: "cold-brew-bottle-1l",
    title: "Hario Filter-In Cold Brew Bottle 1L",
    sku: "FF-ACC-COLDBREW-1L",
    category: "brewers",
    price: 495,
    inventory: 33,
    availability: "in_stock",
    short: "Add coffee, add water, fridge overnight. A heat-proof glass bottle with a fine mesh filter.",
    description: "Heat-resistant glass bottle with silicone spout and fine polyester mesh filter. Capacity: 1 litre. Dishwasher safe (except the filter).",
    images: 3,
    weight: 700,
    tags: "cold brew, hario, summer",
    createdDaysAgo: 330
  }),
  gear({
    slug: "milk-pitcher-600ml",
    title: "Competition Milk Pitcher 600 ml",
    sku: "FF-ACC-PITCHER-600",
    category: "accessories",
    price: 325,
    inventory: 50,
    availability: "in_stock",
    short: "A sharp-spouted 600 ml steel pitcher for latte art. Sized for two flat whites.",
    description: "18/8 stainless steel with a precise spout and measurement lines inside. Capacity: 600 ml.",
    images: 2,
    weight: 260,
    tags: "latte art, espresso, milk",
    createdDaysAgo: 320
  }),
  gear({
    slug: "espresso-tamper-58mm",
    title: "Calibrated Espresso Tamper 58.5 mm",
    sku: "FF-ACC-TAMPER-58",
    category: "accessories",
    price: 650,
    inventory: 19,
    availability: "in_stock",
    short: "A spring-loaded 30 lb calibrated tamper for consistent pressure, shot after shot.",
    description: "58.5 mm flat stainless base fits most commercial 58 mm baskets. Spring-calibrated at 30 lb. Walnut handle.",
    images: 2,
    weight: 480,
    tags: "espresso, tamper, barista",
    createdDaysAgo: 310
  }),
  gear({
    slug: "espresso-knock-box",
    title: "Espresso Knock Box",
    sku: "FF-ACC-KNOCKBOX",
    category: "accessories",
    price: 480,
    inventory: 23,
    availability: "in_stock",
    short: "A heavy, quiet knock box with a rubber bar. Holds a morning's worth of pucks.",
    description: "ABS body, removable silicone-sleeved knock bar, non-slip base. 16 × 13 cm.",
    images: 2,
    weight: 620,
    tags: "espresso, barista",
    createdDaysAgo: 300
  }),
  gear({
    slug: "glass-server-600ml",
    title: "Glass Coffee Server 600 ml",
    sku: "FF-ACC-SERVER-600",
    category: "accessories",
    price: 395,
    inventory: 29,
    availability: "in_stock",
    short: "A heat-proof glass carafe with volume markings. Sits under any V60, Kalita or Switch.",
    description: "Borosilicate glass with 300/600 ml markings. Microwave and dishwasher safe.",
    images: 2,
    weight: 360,
    tags: "pour over, glass",
    createdDaysAgo: 290
  })
];

const giftSets: ProductDef[] = [
  {
    slug: "origin-explorer-trio",
    title: "Origin Explorer Trio — 3 × 100g",
    sku: "FF-GIFT-TRIO",
    category: "gift-sets",
    kind: "gift",
    price: 495,
    inventory: 44,
    availability: "in_stock",
    short: "Three 100 g bags from three continents — Ethiopia, Colombia and Rwanda — with tasting cards.",
    description: "A tour of the coffee belt: a floral Ethiopian, a sweet Colombian and a bright Rwandan, each in a 100 g bag with a tasting card and brew recipe.\n\nPacked in a recycled kraft box.",
    images: 3,
    weight: 450,
    tags: "gift, tasting, single origin",
    popularity: 2.5,
    createdDaysAgo: 330,
    modifiedDaysAgo: 40
  },
  {
    slug: "espresso-lovers-box",
    title: "Espresso Lover's Box",
    sku: "FF-GIFT-ESPRESSO",
    category: "gift-sets",
    kind: "gift",
    price: 1650,
    inventory: 16,
    availability: "in_stock",
    short: "500 g House Espresso, a 58.5 mm calibrated tamper, a milk pitcher and our latte art guide.",
    description: "For the home barista: 2 × 250 g House Espresso Blend, a calibrated tamper, a 600 ml competition milk pitcher and a printed dial-in and latte art guide.",
    images: 3,
    weight: 1600,
    tags: "gift, espresso, barista",
    popularity: 1.2,
    createdDaysAgo: 300,
    modifiedDaysAgo: 35
  },
  {
    slug: "subscription-gift-3-months",
    title: "Coffee Subscription Gift — 3 Months",
    sku: "FF-GIFT-SUB-3M",
    category: "gift-sets",
    kind: "gift",
    price: 1890,
    inventory: 999,
    availability: "in_stock",
    short: "Three monthly deliveries of two 250 g roaster's-choice coffees, starting whenever you choose.",
    description: "We'll email the recipient a gift card with your message, then ship two freshly roasted 250 g bags on the first Tuesday of each month for three months. Free shipping within South Africa.",
    images: 2,
    weight: 600,
    tags: "gift, subscription, bestseller",
    featured: true,
    popularity: 1.5,
    createdDaysAgo: 420,
    modifiedDaysAgo: 28
  }
];

const productDefs: ProductDef[] = [...coreProducts, ...kiloBags, ...microLots, ...seasonalBlends, ...extraDecafs, ...merchVariants, ...gearVariants, ...giftSets].map((p) =>
  p.kind === "coffee" && !p.notes && origins[p.slug] ? { ...p, notes: origins[p.slug].notes } : p
);

function productValues(p: ProductDef): Values {
  return complete("products", {
    title: p.title,
    slug: p.slug,
    sku: p.sku,
    category: p.category,
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? 0,
    currency: seedBrand.currency,
    inventory: p.inventory,
    availability: p.availability,
    shortDescription: p.short,
    description: p.description,
    images: gallery(p.slug, p.title, p.images),
    productVideo: p.video
      ? serializeVideoValue({ src: `https://cdn.${seedBrand.domain}/videos/${p.video.fileName}`, fileName: p.video.fileName, size: p.video.size, contentType: "video/mp4" })
      : "",
    specSheet: p.spec
      ? serializeFileValue({ src: `https://cdn.${seedBrand.domain}/docs/${p.spec.fileName}`, fileName: p.spec.fileName, size: p.spec.size, contentType: "application/pdf" })
      : "",
    weightGrams: p.weight,
    tags: p.tags,
    featured: p.featured ?? false
  });
}

const productRecords: CmsRecord[] = productDefs.map((p) => {
  const values = productValues(p);
  const status = p.status ?? "published";
  let liveValues: Values | null | undefined;
  if (status === "draft" && p.liveOverrides) {
    liveValues = { ...values, ...p.liveOverrides };
  }
  if (p.slug === "comandante-c40-grinder" && liveValues) {
    liveValues.description = String(values.description).replace("Nitro Blade burrs are exceptionally consistent", "Nitro Blade burrs are very consistent");
  }
  return seedRecord({
    id: `product-${p.slug}`,
    publishStatus: status,
    createdAt: daysAgo(p.createdDaysAgo),
    modifiedAt: daysAgo(Math.min(p.modifiedDaysAgo ?? p.createdDaysAgo, p.createdDaysAgo)),
    values,
    liveValues
  });
});

// --- Customers ---------------------------------------------------------------

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  optIn: boolean;
  weight: number;
  wholesale: boolean;
  notes: string;
};

const firstNames = [
  "Thandiwe", "Sipho", "Lerato", "Themba", "Nomvula", "Kagiso", "Ayanda", "Bongani", "Palesa", "Lwazi",
  "Naledi", "Tshepo", "Zinhle", "Mandla", "Refilwe", "Nompumelelo", "Karabo", "Siyabonga", "Busisiwe", "Lungile",
  "Pieter", "Annelie", "Johan", "Marelize", "Hennie", "Elna", "Riaan", "Carien", "Wian", "Liezl",
  "Priya", "Rajesh", "Ayesha", "Yusuf", "Fatima", "Zaid", "Nadia", "Imran", "Shreya", "Kiran",
  "Emma", "James", "Sarah", "Michael", "Jessica", "Liam", "Chloé", "Daniel", "Megan", "Ryan",
  "Tamsin", "Craig", "Kayla", "Tristan", "Zoë", "Luca", "Amahle", "Kea", "Xolani", "Anathi"
] as const;

const lastNames = [
  "Dlamini", "Nkosi", "Mokoena", "Ndlovu", "Khumalo", "Mahlangu", "Zulu", "Mthembu", "Sithole", "Molefe",
  "Naidoo", "Pillay", "Govender", "Moodley", "Reddy", "Chetty", "Patel", "Essop", "Adams", "Jacobs",
  "van der Merwe", "Botha", "du Plessis", "Pretorius", "Venter", "Nel", "Joubert", "Coetzee", "le Roux", "Steyn",
  "Smith", "Williams", "O'Connor", "Fourie", "Kruger", "Meyer", "Hendricks", "Abrahams", "Petersen", "Daniels",
  "Mabuza", "Maseko", "Radebe", "Cele", "Shabalala", "Baloyi", "Makhanya", "Tshabalala", "Ferreira", "Gouws"
] as const;

const zaCities: ReadonlyArray<readonly [string, number]> = [
  ["Cape Town", 34], ["Johannesburg", 18], ["Durban", 9], ["Pretoria", 9], ["Stellenbosch", 7],
  ["Gqeberha", 5], ["Bloemfontein", 4], ["Paarl", 3], ["Franschhoek", 2], ["Hermanus", 3], ["Knysna", 2], ["Somerset West", 3]
];

/** One representative postal code per city — real seeded data doesn't need street-level precision. */
const cityPostalCodes: Record<string, string> = {
  "Cape Town": "8001",
  Johannesburg: "2000",
  Durban: "4001",
  Pretoria: "0002",
  Stellenbosch: "7600",
  Gqeberha: "6001",
  Bloemfontein: "9301",
  Paarl: "7646",
  Franschhoek: "7690",
  Hermanus: "7200",
  Knysna: "6570",
  "Somerset West": "7130"
};

const streetNames = [
  "Long Street", "Kloof Street", "Bree Street", "Main Road", "Church Street", "Buitengracht Street", "Voortrekker Road", "Adderley Street",
  "Loop Street", "Regent Road", "Somerset Road", "Bird Street", "High Street", "Market Street", "Station Road", "Dorp Street"
];

function streetAddress(city: string): string {
  return `${int(1, 199)} ${pick(streetNames)}, ${city}`;
}

const emailDomains: ReadonlyArray<readonly [string, number]> = [
  ["gmail.com", 55], ["outlook.com", 14], ["icloud.com", 14], ["yahoo.com", 5], ["webmail.co.za", 5], ["mweb.co.za", 4], ["hotmail.com", 3]
];

function emailLocal(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

const handCustomers: Array<Omit<Customer, "id">> = [
  // Wholesale accounts (cafés and offices) — heavy repeat buyers of 1kg bags.
  { name: "Kloof Street Kitchen", email: "orders@kloofstreetkitchen.co.za", phone: "+27 21 555 0187", address: "38 Kloof Street", city: "Cape Town", postalCode: "8001", country: "ZA", optIn: true, weight: 6, wholesale: true, notes: "Wholesale café account. Standing order: 6 × 1kg House Espresso every second Monday. Invoice to accounts@." },
  { name: "Bean There Braamfontein", email: "hello@beantherebraam.co.za", phone: "+27 11 555 0133", address: "142 Melle Street, Braamfontein", city: "Johannesburg", postalCode: "2001", country: "ZA", optIn: true, weight: 4, wholesale: true, notes: "Wholesale — filter programme. Prefers Table Mountain Filter Blend 1kg." },
  { name: "Stellenbosch Wine Estates Tasting Room", email: "procurement@swetastingroom.co.za", phone: "+27 21 555 0199", address: "1 Vineyard Road", city: "Stellenbosch", postalCode: "7600", country: "ZA", optIn: false, weight: 2.5, wholesale: true, notes: "Wholesale — seasonal. Deliver to the tasting-room back gate." },
  { name: "Umhlanga Co-Working", email: "office@umhlangacowork.co.za", phone: "+27 31 555 0120", address: "5 Chartwell Drive, Umhlanga", city: "Durban", postalCode: "4319", country: "ZA", optIn: false, weight: 2.5, wholesale: true, notes: "Office coffee supply, 30-day terms approved May 2026." },
  { name: "Mzansi Design Studio", email: "studio@mzansidesign.co.za", phone: "+27 12 555 0111", address: "22 Hatfield Street, Hatfield", city: "Pretoria", postalCode: "0028", country: "ZA", optIn: true, weight: 1.8, wholesale: true, notes: "Office account; used WHOLESALE15 before it was paused." },
  // International shoppers (DHL Express, zero-rated exports).
  { name: "Oliver Bennett", email: "oliver.bennett@outlook.com", phone: "+44 7700 900412", address: "14 Broadway Market, Hackney", city: "London", postalCode: "E8 4PH", country: "GB", optIn: true, weight: 1.4, wholesale: false, notes: "Ex-Capetonian. Ships to Hackney." },
  { name: "Charlotte Hughes", email: "charlotte.hughes@icloud.com", phone: "+44 7700 900871", address: "9 Colebrooke Row, Islington", city: "London", postalCode: "N1 8AA", country: "GB", optIn: false, weight: 0.8, wholesale: false, notes: "" },
  { name: "Lena Hoffmann", email: "lena.hoffmann@gmail.com", phone: "+49 151 23456789", address: "12 Kastanienallee", city: "Berlin", postalCode: "10435", country: "DE", optIn: true, weight: 0.9, wholesale: false, notes: "" },
  { name: "Jonas Müller", email: "jonas.mueller@outlook.com", phone: "", address: "", city: "Berlin", postalCode: "", country: "DE", optIn: false, weight: 0.6, wholesale: false, notes: "No phone on file — contact by email only." },
  { name: "Wanjiru Kamau", email: "wanjiru.kamau@gmail.com", phone: "+254 712 345678", address: "45 Kilimani Road", city: "Nairobi", postalCode: "00100", country: "KE", optIn: true, weight: 0.8, wholesale: false, notes: "" },
  { name: "Brian Otieno", email: "brian.otieno@icloud.com", phone: "+254 722 901234", address: "", city: "Nairobi", postalCode: "00100", country: "KE", optIn: false, weight: 0.5, wholesale: false, notes: "" }
];

const CUSTOMER_COUNT = 150;

const customers: Customer[] = (() => {
  const list: Customer[] = [];
  const emails = new Set<string>();
  const names = new Set<string>();
  handCustomers.forEach((c) => {
    emails.add(c.email);
    names.add(c.name);
    list.push({ ...c, id: "" });
  });
  while (list.length < CUSTOMER_COUNT) {
    const first = pick(firstNames);
    const last = pick(lastNames);
    const name = `${first} ${last}`;
    if (names.has(name)) continue;
    names.add(name);
    const f = emailLocal(first);
    const l = emailLocal(last);
    const domain = weighted(emailDomains);
    const pattern = int(0, 5);
    let local = pattern <= 2 ? `${f}.${l}` : pattern === 3 ? `${f}${l}` : pattern === 4 ? `${f[0]}${l}` : `${f}.${l}${int(70, 99)}`;
    while (emails.has(`${local}@${domain}`)) local += int(1, 9);
    const email = `${local}@${domain}`;
    emails.add(email);
    const index = list.length;
    const noPhone = index % 23 === 7;
    const phone = noPhone ? "" : `+27 ${pick(["60", "61", "71", "72", "73", "74", "76", "79", "81", "82", "83", "84"])} ${int(100, 999)} ${String(int(0, 9999)).padStart(4, "0")}`;
    const city = weighted(zaCities);
    // Pareto-ish: most shoppers buy once or twice, a few are regulars; ~10% never ordered.
    const r = rand();
    const weight = index % 10 === 3 ? 0 : r < 0.12 ? 3 + rand() * 3 : r < 0.4 ? 1 + rand() : 0.25 + rand() * 0.5;
    // Browsers-only customers (never ordered) never had a shipping address collected.
    const address = weight === 0 ? "" : streetAddress(city);
    const postalCode = weight === 0 ? "" : (cityPostalCodes[city] ?? "");
    list.push({
      id: "",
      name,
      email,
      phone,
      address,
      city,
      postalCode,
      country: "ZA",
      optIn: chance(0.62),
      weight,
      wholesale: false,
      notes: noPhone ? "Declined to share a phone number at checkout." : ""
    });
  }
  return list.map((c, i) => ({ ...c, id: `customer-${String(i + 1).padStart(4, "0")}` }));
})();

// --- Discount codes ----------------------------------------------------------

type DiscountDef = {
  code: string;
  description: string;
  discountType: "percentage" | "fixed_amount" | "free_shipping";
  amount: number;
  minimumSubtotal: number;
  usageLimit: number;
  /** Days-ago window; `endsDaysAgo` null = never expires. */
  startsDaysAgo: number;
  endsDaysAgo: number | null;
  active: boolean;
  /** Probability an eligible order uses it. */
  uptake: number;
  wholesaleOnly?: boolean;
  firstOrderOnly?: boolean;
};

/** Days before seedNow for a UTC calendar date. */
function daysBefore(y: number, m: number, d: number): number {
  return (nowMs - Date.UTC(y, m - 1, d)) / DAY;
}

const discountDefs: DiscountDef[] = [
  { code: "WELCOME10", description: "Evergreen 10% off a first order — newsletter sign-up pop-up.", discountType: "percentage", amount: 10, minimumSubtotal: 0, usageLimit: 0, startsDaysAgo: 540, endsDaysAgo: null, active: true, uptake: 0.35, firstOrderOnly: true },
  { code: "BLACKFRIDAY25", description: "Black Friday → Cyber Monday 2025, 25% off sitewide.", discountType: "percentage", amount: 25, minimumSubtotal: 0, usageLimit: 0, startsDaysAgo: daysBefore(2025, 11, 28), endsDaysAgo: daysBefore(2025, 12, 2), active: false, uptake: 0.75 },
  { code: "FESTIVE100", description: "R100 off orders over R800, December 2025 gifting campaign.", discountType: "fixed_amount", amount: 100, minimumSubtotal: 800, usageLimit: 0, startsDaysAgo: daysBefore(2025, 12, 2), endsDaysAgo: daysBefore(2025, 12, 25), active: true, uptake: 0.35 },
  { code: "FREESHIP", description: "Free shipping on orders over R350 (ex VAT) — used in Instagram stories.", discountType: "free_shipping", amount: 0, minimumSubtotal: 350, usageLimit: 0, startsDaysAgo: 400, endsDaysAgo: null, active: true, uptake: 0.08 },
  { code: "WINTERWARMER15", description: "Winter campaign 2026 — 15% off. Expired end of July.", discountType: "percentage", amount: 15, minimumSubtotal: 300, usageLimit: 0, startsDaysAgo: daysBefore(2026, 6, 1), endsDaysAgo: daysBefore(2026, 8, 1), active: true, uptake: 0.25 },
  { code: "ROASTERYOPEN", description: "Roastery open day March 2026: R150 off, first 20 redemptions.", discountType: "fixed_amount", amount: 150, minimumSubtotal: 500, usageLimit: 20, startsDaysAgo: daysBefore(2026, 3, 14), endsDaysAgo: daysBefore(2026, 4, 30), active: true, uptake: 0.8 },
  { code: "WHOLESALE15", description: "Trade discount for office accounts. Paused June 2026 — trade pricing now on invoice.", discountType: "percentage", amount: 15, minimumSubtotal: 1000, usageLimit: 0, startsDaysAgo: 420, endsDaysAgo: null, active: false, uptake: 0.9, wholesaleOnly: true },
  { code: "FYNBOSFRIENDS", description: "Refer-a-friend reward, R75 off.", discountType: "fixed_amount", amount: 75, minimumSubtotal: 250, usageLimit: 0, startsDaysAgo: 300, endsDaysAgo: null, active: true, uptake: 0.04 },
  { code: "GIFT-WINNER-2026", description: "100% off — Instagram giveaway winner (one use).", discountType: "percentage", amount: 100, minimumSubtotal: 0, usageLimit: 1, startsDaysAgo: daysBefore(2026, 4, 1), endsDaysAgo: daysBefore(2026, 5, 1), active: true, uptake: 0 },
  { code: "SPRING2026", description: "Spring launch, 10% off — scheduled, starts next week.", discountType: "percentage", amount: 10, minimumSubtotal: 0, usageLimit: 500, startsDaysAgo: -7, endsDaysAgo: -37, active: true, uptake: 0 }
];

// --- Orders ------------------------------------------------------------------

type LineItem = { slug: string; qty: number; unitCents: number };
type Order = {
  number: string;
  placedMs: number;
  customer: Customer;
  items: LineItem[];
  values: Values;
  modifiedMs: number;
};

const ORDER_COUNT = 400;
const FIRST_ORDER_NUMBER = 10421;
const VAT = 0.15;
const FREE_SHIPPING_CENTS = 60_000;

function dayWeight(d: number): number {
  const date = new Date(nowMs - d * DAY);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  let w = 1 + 0.6 * (1 - d / 365); // steady growth
  if (month === 12 && day <= 23) w *= 2.7;
  else if (month === 12) w *= 1.1;
  else if (month === 1) w *= 0.7;
  else if (month >= 6 && month <= 8) w *= 1.2; // winter
  if (month === 11 && day >= 28) w *= 9; // Black Friday weekend
  if (month === 12 && day === 1) w *= 5; // Cyber Monday
  if (month === 6 && day >= 12 && day <= 20) w *= 1.6; // Father's Day
  if (month === 5 && day >= 3 && day <= 9) w *= 1.4; // Mother's Day
  if (month === 3 && day >= 14 && day <= 22) w *= 1.8; // roastery open day
  return w;
}

const orderPlacements: number[] = (() => {
  const weights = Array.from({ length: 365 }, (_, i) => dayWeight(365 - i - 0.5));
  const total = weights.reduce((a, b) => a + b, 0);
  const placements: number[] = [];
  let cumulative = 0;
  let dayIndex = 0;
  for (let i = 0; i < ORDER_COUNT; i += 1) {
    const target = ((i + rand()) / ORDER_COUNT) * total;
    while (dayIndex < 364 && cumulative + weights[dayIndex] < target) {
      cumulative += weights[dayIndex];
      dayIndex += 1;
    }
    const dayStart = nowMs - (365 - dayIndex) * DAY;
    const midnight = dayStart - (dayStart % DAY);
    // 06:00–22:00 SAST (UTC+2)
    let placed = midnight + (4 + rand() * 16) * 3_600_000;
    if (placed > nowMs - 600_000) placed = nowMs - (10 + rand() * 180) * 60_000;
    placements.push(Math.round(placed / 1000) * 1000);
  }
  return placements.sort((a, b) => a - b);
})();

const sellable = productDefs.filter((p) => p.status !== "queued_to_publish");
const productDefBySlug = new Map(productDefs.map((p) => [p.slug, p]));
/** First gallery image of each product, read back from the already-built product records so it always matches what shipped. */
const productImageBySlug = new Map(productRecords.map((r) => [String(r.values.slug), parseImageGallery(r.values.images)[0]?.src ?? ""]));

/** Serializes an order's line items to the `OrderLineItem[]` shape from `@three-acts/ecommerce`. */
function serializeOrderItems(items: LineItem[]): string {
  return JSON.stringify(
    items.map((item) => {
      const product = productDefBySlug.get(item.slug)!;
      const image = productImageBySlug.get(item.slug);
      return {
        slug: item.slug,
        sku: product.sku,
        title: product.title,
        quantity: item.qty,
        unitPrice: money(item.unitCents),
        lineTotal: money(item.unitCents * item.qty),
        currency: seedBrand.currency,
        ...(image ? { image } : {})
      };
    })
  );
}

function onSaleAt(p: ProductDef, daysAgoValue: number): boolean {
  if (p.createdDaysAgo < daysAgoValue) return false;
  if (!p.window) return true;
  return daysAgoValue <= p.window[0] && daysAgoValue >= p.window[1];
}

function priceCentsAt(p: ProductDef, daysAgoValue: number): number {
  // Drafted price rises aren't live yet: orders were charged the live price.
  const live = p.liveOverrides?.price;
  return Math.round((typeof live === "number" ? live : p.price) * 100);
}

function pickItems(customer: Customer, d: number, month: number): LineItem[] {
  const available = sellable.filter((p) => onSaleAt(p, d));
  const giftSeason = month === 12 || (month === 11 && d < daysBefore(2025, 11, 20));
  const weightFor = (p: ProductDef) => {
    let w = p.popularity ?? 1;
    if (p.kind === "gift" && giftSeason) w *= 3;
    if (p.kind === "gear" && giftSeason) w *= 1.6;
    if (p.window && p.kind === "coffee") w *= 2.5; // seasonal releases sell hard while live
    return w;
  };
  if (customer.wholesale) {
    const kilos = available.filter((p) => p.slug.endsWith("-1kg"));
    const preferred = customer.email.startsWith("hello@") ? "table-mountain-filter-blend-1kg" : "house-espresso-blend-1kg";
    const items: LineItem[] = [{ slug: preferred, qty: int(4, 10), unitCents: 0 }];
    if (chance(0.5)) {
      const extra = pick(kilos.filter((p) => p.slug !== preferred));
      if (extra) items.push({ slug: extra.slug, qty: int(1, 3), unitCents: 0 });
    }
    if (chance(0.3)) items.push({ slug: "v60-paper-filters-02", qty: int(2, 6), unitCents: 0 });
    return items.map((item) => ({ ...item, unitCents: priceCentsAt(productDefs.find((p) => p.slug === item.slug)!, d) }));
  }
  const lineCount = weighted([[1, 45], [2, 32], [3, 16], [4, 7]] as const);
  const chosen = new Map<string, LineItem>();
  let guard = 0;
  while (chosen.size < lineCount && guard < 20) {
    guard += 1;
    const p = weighted(available.map((x) => [x, weightFor(x)] as const));
    if (chosen.has(p.slug)) continue;
    const qty = p.kind === "coffee" ? weighted([[1, 60], [2, 30], [3, 10]] as const) : p.slug.includes("filters") ? int(1, 3) : 1;
    chosen.set(p.slug, { slug: p.slug, qty, unitCents: priceCentsAt(p, d) });
  }
  return [...chosen.values()];
}

const couriers = ["TCG", "PUDO", "ARX"] as const;

const orders: Order[] = (() => {
  const result: Order[] = [];
  const uses = new Map<string, number>();
  const ordersByCustomer = new Map<string, number>();
  const zeroValueIndex = orderPlacements.findIndex((ms) => ms >= nowMs - daysBefore(2026, 4, 8) * DAY);
  const buyers = customers.filter((c) => c.weight > 0);
  const buyerEntries = buyers.map((c) => [c, c.weight] as const);
  // Every buyer orders at least once; the remaining slots follow the weights. Shuffled across the year.
  const assignments: Customer[] = [...buyers];
  while (assignments.length < ORDER_COUNT) assignments.push(weighted(buyerEntries));
  for (let i = assignments.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [assignments[i], assignments[j]] = [assignments[j], assignments[i]];
  }
  const giveawayWinner = customers[20];

  orderPlacements.forEach((placedMs, index) => {
    const d = (nowMs - placedMs) / DAY;
    const date = new Date(placedMs);
    const month = date.getUTCMonth() + 1;
    const isGiveaway = index === zeroValueIndex;
    const customer = isGiveaway ? giveawayWinner : assignments[index];
    const priorOrders = ordersByCustomer.get(customer.email) ?? 0;
    ordersByCustomer.set(customer.email, priorOrders + 1);

    const items = isGiveaway ? [{ slug: "brew-at-home-gift-set", qty: 1, unitCents: 109_500 }] : pickItems(customer, d, month);
    const grossCents = items.reduce((sum, item) => sum + item.unitCents * item.qty, 0);
    const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = Math.round(grossCents / (1 + VAT));
    const international = customer.country !== "ZA";

    // Discount selection: first eligible code whose dice roll succeeds.
    let code: DiscountDef | undefined;
    if (isGiveaway) {
      code = discountDefs.find((c) => c.code === "GIFT-WINNER-2026");
    } else {
      for (const c of discountDefs) {
        if (c.uptake === 0) continue;
        if (d > c.startsDaysAgo || (c.endsDaysAgo !== null && d < c.endsDaysAgo)) continue;
        if (c.wholesaleOnly !== customer.wholesale && c.wholesaleOnly) continue;
        if (c.wholesaleOnly && d < 90) continue; // paused in June
        if (!c.wholesaleOnly && customer.wholesale) continue;
        if (c.firstOrderOnly && priorOrders > 0) continue;
        if (subtotal < c.minimumSubtotal * 100) continue;
        if (c.usageLimit > 0 && (uses.get(c.code) ?? 0) >= c.usageLimit) continue;
        if (c.discountType === "free_shipping" && (international || subtotal * (1 + VAT) >= FREE_SHIPPING_CENTS)) continue;
        if (chance(c.uptake)) {
          code = c;
          break;
        }
      }
    }
    if (code) uses.set(code.code, (uses.get(code.code) ?? 0) + 1);

    let discount = 0;
    if (code?.discountType === "percentage") discount = Math.round((subtotal * code.amount) / 100);
    if (code?.discountType === "fixed_amount") discount = Math.min(code.amount * 100, subtotal);
    const taxable = subtotal - discount;
    const tax = international ? 0 : Math.round(taxable * VAT);
    const collect = !international && customer.city === "Cape Town" && !customer.wholesale && chance(0.1);
    let shipping = international ? 45_000 : taxable + tax >= FREE_SHIPPING_CENTS ? 0 : 9_500;
    if (collect || code?.discountType === "free_shipping" || isGiveaway || (customer.wholesale && !international)) shipping = 0;
    const total = taxable + tax + shipping;

    // Lifecycle by age.
    let status: string;
    let paymentStatus: string;
    let paymentMethod = international ? weighted([["card", 60], ["paypal", 40]] as const) : weighted([["card", 55], ["eft", 20], ["apple_pay", 15], ["paypal", 7], ["gift_card", 3]] as const);
    if (customer.wholesale) paymentMethod = "eft";
    const roll = rand();
    if (d < 1.5) {
      if (paymentMethod === "eft" && roll < 0.6) [status, paymentStatus] = ["pending", "awaiting"];
      else if (roll < 0.15) [status, paymentStatus] = ["pending", "authorized"];
      else [status, paymentStatus] = ["paid", "paid"];
    } else if (d < 4) {
      [status, paymentStatus] = collect ? ["paid", "paid"] : roll < 0.35 ? ["paid", "paid"] : ["shipped", "paid"];
    } else if (d < 10) {
      [status, paymentStatus] = collect ? ["fulfilled", "paid"] : roll < 0.7 ? ["shipped", "paid"] : ["fulfilled", "paid"];
    } else if (roll < 0.035 && !isGiveaway) {
      [status, paymentStatus] = ["refunded", "refunded"];
    } else if (roll < 0.055 && !isGiveaway) {
      [status, paymentStatus] = ["cancelled", paymentMethod === "eft" ? "awaiting" : "failed"];
    } else {
      [status, paymentStatus] = ["fulfilled", "paid"];
    }
    if (isGiveaway) {
      paymentMethod = "gift_card";
      [status, paymentStatus] = ["fulfilled", "paid"];
    }

    const shipsWithCourier = !collect && (status === "shipped" || status === "fulfilled" || status === "refunded");
    const trackingNumber = shipsWithCourier ? (international ? `DHL${int(1_000_000_000, 9_999_999_999)}` : `${pick(couriers)}${int(100_000_000, 999_999_999)}`) : "";

    const noteOptions = [
      "Gift — please leave the invoice out of the box.",
      "Leave with security at the gate if no one answers.",
      "Customer asked for the coffee ground for AeroPress.",
      "Customer asked for the coffee ground for espresso (fine).",
      "Please deliver after 2pm — works night shift."
    ];
    let notes = "";
    if (isGiveaway) notes = "Instagram giveaway prize — 100% code, no payment taken.";
    else if (collect) notes = "Collected at the Woodstock roastery.";
    else if (status === "refunded") notes = pick(["Refunded in full — bag split in transit, courier claim lodged.", "Refunded — customer ordered the wrong grinder, returned unopened.", "Refunded — parcel lost by courier."]);
    else if (status === "cancelled") notes = paymentStatus === "failed" ? "Card declined twice — auto-cancelled after 48h." : "EFT never received — cancelled after 5 days.";
    else if (international) notes = "Customs declaration: roasted coffee, HS 0901.21. Zero-rated export.";
    else if (customer.wholesale) notes = "Wholesale delivery, 30-day invoice.";
    else if (chance(0.06)) notes = pick(noteOptions);

    const fulfilmentDays = status === "fulfilled" || status === "refunded" ? int(2, 9) : status === "shipped" ? rand() : status === "cancelled" ? 5 : 0;
    const modifiedMs = Math.min(placedMs + fulfilmentDays * DAY + int(1, 120) * 60_000, nowMs);
    const orderNumber = `FF-${FIRST_ORDER_NUMBER + index}`;

    result.push({
      number: orderNumber,
      placedMs,
      customer,
      items,
      modifiedMs,
      values: complete("orders", {
        orderNumber,
        customerEmail: customer.email,
        customerName: customer.name,
        status,
        paymentStatus,
        paymentMethod,
        itemCount,
        items: serializeOrderItems(items),
        subtotal: money(subtotal),
        discountTotal: money(discount),
        discountCode: code?.code ?? "",
        taxTotal: money(tax),
        shippingTotal: money(shipping),
        total: money(total),
        currency: seedBrand.currency,
        placedAt: iso(placedMs),
        shippingCity: customer.city,
        shippingCountry: customer.country,
        trackingNumber,
        notes,
        shippingName: customer.name,
        shippingAddress: customer.address,
        shippingPostalCode: customer.postalCode,
        customerPhone: customer.phone
      })
    });
  });
  return result;
})();

const orderRecords: CmsRecord[] = orders.map((o) =>
  seedRecord({ id: `order-${o.number}`, publishStatus: "not_published", createdAt: iso(o.placedMs), modifiedAt: iso(o.modifiedMs), values: o.values, liveValues: null })
);

const discountRecords: CmsRecord[] = discountDefs.map((c) => {
  const timesUsed = orders.filter((o) => o.values.discountCode === c.code).length;
  const created = Math.max(c.startsDaysAgo + 14, 20);
  return seedRecord({
    id: `discount-${c.code.toLowerCase()}`,
    createdAt: daysAgo(created),
    modifiedAt: daysAgo(c.code === "WHOLESALE15" ? 88 : c.endsDaysAgo !== null && c.endsDaysAgo > 0 ? c.endsDaysAgo : Math.min(created, 3)),
    publishStatus: "not_published",
    liveValues: null,
    values: complete("discount-codes", {
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      amount: c.amount,
      minimumSubtotal: c.minimumSubtotal,
      usageLimit: c.usageLimit,
      timesUsed,
      startsAt: iso(Math.round((nowMs - c.startsDaysAgo * DAY) / 60_000) * 60_000),
      endsAt: c.endsDaysAgo === null ? "" : iso(Math.round((nowMs - c.endsDaysAgo * DAY) / 60_000) * 60_000),
      active: c.active
    })
  });
});

const customerRecords: CmsRecord[] = customers.map((c, index) => {
  const own = orders.filter((o) => o.customer.email === c.email);
  const first = own[0]?.placedMs;
  const last = own[own.length - 1]?.placedMs;
  const lifetimeCents = own.filter((o) => o.values.paymentStatus === "paid").reduce((sum, o) => sum + Math.round(Number(o.values.total) * 100), 0);
  // Account created at (or shortly before) the first checkout; browsers-only signed up any time.
  const createdMs = first !== undefined ? first - (index % 3 === 0 ? 0 : (index % 17) * DAY) - 60_000 : nowMs - (20 + ((index * 53) % 340)) * DAY;
  const modifiedMs = last !== undefined ? Math.max(last, createdMs) : createdMs + ((index * 7) % 15) * DAY;
  return seedRecord({
    id: c.id,
    createdAt: iso(createdMs),
    modifiedAt: iso(Math.min(modifiedMs, nowMs)),
    publishStatus: "not_published",
    liveValues: null,
    values: complete("customers", {
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      postalCode: c.postalCode,
      country: c.country,
      marketingOptIn: c.optIn,
      totalOrders: own.length,
      lifetimeValue: money(lifetimeCents),
      firstOrderAt: first !== undefined ? iso(first) : "",
      lastOrderAt: last !== undefined ? iso(last) : "",
      notes: c.notes || (own.length === 0 ? "Created an account but hasn't ordered yet." : "")
    })
  });
});

// --- Product reviews ---------------------------------------------------------

type Tone = "great" | "good" | "meh" | "bad";

const reviewCopy: Record<Kind, Record<Tone, { titles: string[]; bodies: string[] }>> = {
  coffee: {
    great: {
      titles: ["New favourite", "Absolutely delicious", "Worth every rand", "Best bag I've bought this year", "Ordering again", "Stunning cup"],
      bodies: [
        "Getting loads of {n1} and {n2} on the V60 — exactly what the bag promised.",
        "Arrived two days after roasting and it's been brilliant from day seven onwards. {N1} up front, {n3} as it cools.",
        "Dialled in at 18 g in, 40 g out in 29 seconds and it tastes like {n2}. My partner has stopped buying capsules.",
        "I've tried a lot of local roasters and this is the one I keep coming back to. Clean, sweet and really {n1}-forward.",
        "Brewed it in a Chemex for guests and everyone asked where it was from."
      ]
    },
    good: {
      titles: ["Really good", "Solid everyday coffee", "Lovely, slightly different to expected", "Very nice"],
      bodies: [
        "Lovely coffee. I get more {n3} than {n1}, but it's sweet and easy to drink.",
        "Good in the AeroPress, a bit sharp as espresso until I ground finer. Would buy again.",
        "Nice and fresh, great packaging. Took me a few brews to find the sweet spot.",
        "A little pricier than the supermarket but not comparable really. {N2} comes through in milk."
      ]
    },
    meh: {
      titles: ["Fine, not for me", "Okay", "Just alright"],
      bodies: [
        "It's well roasted but too bright for my taste — I prefer the House Espresso.",
        "Decent, but I didn't get much {n1}. Might be my grinder.",
        "Good quality, just not the flavour profile I enjoy."
      ]
    },
    bad: {
      titles: ["Disappointed", "Arrived stale", "Not what I expected"],
      bodies: [
        "Bag was roasted almost three weeks before it arrived — courier delay, but it tasted flat.",
        "Very sour no matter what I tried. Customer service offered a replacement, to be fair.",
        "Valve was broken and the beans had lost their aroma. Support sorted it but I'm rating the product."
      ]
    }
  },
  gear: {
    great: {
      titles: ["Game changer", "Excellent build quality", "Should have bought this years ago", "Perfect", "Brilliant bit of kit"],
      bodies: [
        "Beautifully made and it's made a real difference to my morning brew.",
        "Arrived next day in Joburg, well packed. Works exactly as described.",
        "Used it every day for three months and it still feels brand new.",
        "The Fynbos & Fire brew guide that came with it was a nice touch — got a great cup first try."
      ]
    },
    good: {
      titles: ["Very happy", "Good value", "Does the job well"],
      bodies: [
        "Does what it says. Slightly smaller than I imagined from the photos.",
        "Good quality for the price. Delivery took a week to Gqeberha.",
        "Works well, instructions could be clearer."
      ]
    },
    meh: {
      titles: ["Average", "It's fine"],
      bodies: ["Works but feels a bit cheap in hand for the price.", "Fine for occasional use. I expected better finishing."]
    },
    bad: {
      titles: ["Broke within a month", "Arrived damaged"],
      bodies: ["Arrived with a chip on the rim. Replacement was sent quickly but the first impression wasn't great.", "Stopped working after a few weeks. Waiting on the warranty claim."]
    }
  },
  merch: {
    great: {
      titles: ["Love it", "Great quality", "Gets compliments every time"],
      bodies: ["Really good quality and the print is lovely.", "Bought one for me and one for my brother. Great gift.", "Heavier and nicer than I expected."]
    },
    good: { titles: ["Nice", "Happy with it"], bodies: ["Nice quality, colour slightly darker than the photo.", "Runs a little big but I like the relaxed fit."] },
    meh: { titles: ["Okay"], bodies: ["It's fine. The print started to fade after a few washes."] },
    bad: { titles: ["Not great"], bodies: ["Enamel chipped the first time I took it camping."] }
  },
  gift: {
    great: {
      titles: ["Perfect gift", "The recipient loved it", "Beautifully packed"],
      bodies: ["Sent this to my dad in Durban and he's now obsessed with pour-over.", "Gorgeous packaging and the handwritten note was a lovely touch.", "Great value compared to buying everything separately."]
    },
    good: { titles: ["Lovely gift"], bodies: ["Lovely set. Took a few extra days in December but arrived before Christmas."] },
    meh: { titles: ["Fine"], bodies: ["Nice but I wish I could choose the coffee in the box."] },
    bad: { titles: ["Late for the birthday"], bodies: ["Arrived after the birthday despite ordering a week early."] }
  }
};

function fillReview(template: string, notes: string[] | undefined): string {
  const n = notes ?? ["sweetness", "chocolate", "fruit"];
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return template
    .replace("{n1}", n[0])
    .replace("{n2}", n[1])
    .replace("{n3}", n[2])
    .replace("{N1}", cap(n[0]))
    .replace("{N2}", cap(n[1]));
}

function displayName(fullName: string): string {
  const parts = fullName.split(" ");
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.` : fullName;
}

const REVIEW_COUNT = 120;
const UNVERIFIED_REVIEWS = 14;

const reviewRecords: CmsRecord[] = (() => {
  const records: CmsRecord[] = [];
  const seen = new Set<string>();
  const eligible = orders.filter((o) => !o.customer.wholesale && (o.values.status === "fulfilled" || o.values.status === "shipped") && o.placedMs < nowMs - 6 * DAY);
  const productBySlug = new Map(productDefs.map((p) => [p.slug, p]));

  const toneFor = (): { rating: string; tone: Tone } => {
    const rating = weighted([["5", 56], ["4", 25], ["3", 10], ["2", 5], ["1", 4]] as const);
    return { rating, tone: rating === "5" ? "great" : rating === "4" ? "good" : rating === "3" ? "meh" : "bad" };
  };

  const push = (input: { product: ProductDef; name: string; email: string; verified: boolean; submittedMs: number }) => {
    const { rating, tone } = toneFor();
    const copy = reviewCopy[input.product.kind][tone];
    const recent = input.submittedMs > nowMs - 10 * DAY;
    const approved = recent ? chance(0.4) : rating === "1" ? chance(0.7) : chance(0.96);
    const index = records.length + 1;
    records.push(
      seedRecord({
        id: `review-${String(index).padStart(4, "0")}`,
        createdAt: iso(input.submittedMs),
        modifiedAt: iso(Math.min(input.submittedMs + (approved ? int(2, 48) * 3_600_000 : 0), nowMs)),
        publishStatus: "not_published",
        liveValues: null,
        values: complete("product-reviews", {
          title: pick(copy.titles),
          product: input.product.slug,
          customerName: input.name,
          customerEmail: input.email,
          rating,
          body: fillReview(pick(copy.bodies), input.product.notes),
          verifiedPurchase: input.verified,
          approved,
          submittedAt: iso(input.submittedMs)
        })
      })
    );
  };

  let guard = 0;
  while (records.length < REVIEW_COUNT - UNVERIFIED_REVIEWS && guard < 5000) {
    guard += 1;
    const order = pick(eligible);
    const item = pick(order.items);
    const key = `${order.customer.email}|${item.slug}`;
    if (seen.has(key)) continue;
    const submittedMs = Math.round((order.placedMs + (5 + rand() * 25) * DAY) / 1000) * 1000;
    if (submittedMs >= nowMs) continue;
    seen.add(key);
    push({ product: productBySlug.get(item.slug)!, name: displayName(order.customer.name), email: order.customer.email, verified: true, submittedMs });
  }

  const guestNames = ["Thabo", "Megan R.", "Anonymous", "Coffee nerd from Joburg", "Riana", "Sizwe M.", "Kate", "Nkosi", "Hannah P.", "Faiez", "Lindo", "Bianca", "Jean-Pierre", "Owethu"];
  const reviewable = productDefs.filter((p) => p.status !== "queued_to_publish" && p.status !== "not_published");
  for (let i = 0; i < UNVERIFIED_REVIEWS; i += 1) {
    const product = pick(reviewable);
    const submittedMs = nowMs - Math.round((1 + rand() * Math.min(300, product.createdDaysAgo - 1)) * DAY);
    push({ product, name: guestNames[i % guestNames.length], email: "", verified: false, submittedMs });
  }
  return records
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((r, i) => ({
      ...r,
      id: `review-${String(i + 1).padStart(4, "0")}`,
      // ~10 of the 120 reviews were phoned or emailed in and added by staff; the rest came through the site form.
      values: { ...r.values, source: i % 12 === 0 ? "manual" : "site" }
    }));
})();

// --- Testimonials ------------------------------------------------------------

const testimonialDefs: Array<{ name: string; quote: string; title: string; company?: string; rating: string; product?: (typeof productSlugs)[number]; featured?: boolean; status?: PublishStatus; daysAgo: number }> = [
  { name: "Thandiwe Mokoena", title: "Architect, Johannesburg", quote: "The Yirgacheffe tastes like jasmine tea with a peach on the side. I've converted my whole office to pour-over.", rating: "5", product: "ethiopia-yirgacheffe-kochere", featured: true, daysAgo: 300 },
  { name: "Pieter Botha", title: "Home barista, Stellenbosch", quote: "Freshest beans I've ever had delivered. Roast date is always within two days of arriving, and the House Espresso is foolproof in milk.", rating: "5", product: "house-espresso-blend", featured: true, daysAgo: 280 },
  { name: "Ayesha Essop", title: "Pastry chef, Cape Town", quote: "We serve the Table Mountain blend as our batch brew and customers ask for it by name.", company: "Crumb & Co.", rating: "5", product: "table-mountain-filter-blend", featured: true, daysAgo: 250 },
  { name: "Oliver Bennett", title: "London", quote: "Worth the DHL fee. A taste of home that's genuinely better than most of what I can buy here.", rating: "5", daysAgo: 210 },
  { name: "Nomvula Dlamini", title: "Durban", quote: "Bought the Brew at Home set for my mum's birthday. She sends me photos of her V60 every Sunday now.", rating: "5", product: "brew-at-home-gift-set", daysAgo: 200 },
  { name: "Riaan Venter", title: "Engineer, Pretoria", quote: "Ordered the Comandante on their advice and it transformed my espresso. Honest recommendations, no upselling.", rating: "5", product: "comandante-c40-grinder", daysAgo: 190 },
  { name: "Priya Naidoo", title: "Doctor, Gqeberha", quote: "The decaf is the first one I've enjoyed. Night shifts just got better.", rating: "4", product: "swiss-water-decaf-peru", daysAgo: 160 },
  { name: "Kagiso Molefe", title: "Trail runner, Cape Town", quote: "AeroPress Go lives in my pack. Summit coffee on Lion's Head hits different.", rating: "5", product: "aeropress-go", featured: true, daysAgo: 120 },
  { name: "Liezl du Plessis", title: "Bloemfontein", quote: "Great coffee, and when a bag arrived split they replaced it the same day without any fuss.", rating: "4", daysAgo: 90 },
  { name: "Wanjiru Kamau", title: "Nairobi", quote: "As a Kenyan I'm picky about Kenyan coffee — the Gatomboya does Nyeri proud.", rating: "5", product: "kenya-nyeri-gatomboya", daysAgo: 60, status: "draft" },
  { name: "Sipho Ndlovu", title: "Café owner, Johannesburg", company: "Bean There Braamfontein", quote: "Consistent roasts, reliable delivery and they actually pick up the phone. Our wholesale partner of two years.", rating: "5", daysAgo: 14, status: "queued_to_publish" },
  { name: "Megan Smith", title: "Knysna", quote: "Loved the Colombian, not so sure about the pricier micro-lots — but that's personal taste.", rating: "3", product: "colombia-huila-la-esperanza", daysAgo: 45, status: "not_published" }
];

const testimonialRecords: CmsRecord[] = testimonialDefs.map((t, index) => {
  const values = complete("testimonials", {
    customerName: t.name,
    quote: t.quote,
    customerTitle: t.title,
    company: t.company ?? "",
    avatar: serializeImageValue({
      src: `https://picsum.photos/seed/testimonial-${index + 1}/400/400`,
      fileName: `testimonial-${index + 1}.jpg`,
      width: 400,
      height: 400,
      alt: t.name
    }),
    rating: t.rating,
    product: t.product ?? "",
    featured: t.featured ?? false,
    sortOrder: (index + 1) * 10
  });
  const status = t.status ?? "published";
  return seedRecord({
    id: `testimonial-${String(index + 1).padStart(2, "0")}`,
    publishStatus: status,
    createdAt: daysAgo(t.daysAgo),
    modifiedAt: daysAgo(Math.max(t.daysAgo - 7, 1)),
    values,
    // The draft edits a published quote: the site still shows the shorter original.
    liveValues: status === "draft" ? { ...values, quote: "As a Kenyan I'm picky about Kenyan coffee. This one is excellent." } : undefined
  });
});

export const shopSeed: SeedCollections = {
  "product-categories": productCategoryRecords,
  products: productRecords,
  testimonials: testimonialRecords,
  customers: customerRecords,
  orders: orderRecords,
  "product-reviews": reviewRecords,
  "discount-codes": discountRecords
};
