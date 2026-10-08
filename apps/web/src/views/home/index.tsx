import type { Article, Faq, Testimonial } from "@three-acts/content";
import type { Product, ProductCategory } from "@three-acts/ecommerce";
import { validateLayout, type HomeCopy, type LayoutDocument } from "@three-acts/static-content";
import layoutSource from "@three-acts/static-content/documents/layout.json";
import sourceCopy from "@three-acts/static-content/documents/home.json";
import { cn } from "@three-acts/utils";
import { componentAttributes, componentClass } from "../../lib/design";
import { homeSectionScope } from "../../components/home/section-scope";
import { CtaSection } from "../../components/home/cta-section";
import { FaqTeaserSection } from "../../components/home/faq-teaser-section";
import { FeaturedProductsSection } from "../../components/home/featured-products-section";
import { HeroSection } from "../../components/home/hero-section";
import { IntroSection } from "../../components/home/intro-section";
import { JournalSection } from "../../components/home/journal-section";
import { ShopByCategorySection } from "../../components/home/shop-by-category-section";
import { StatSection } from "../../components/home/stat-section";
import { TestimonialsSection } from "../../components/home/testimonials-section";
import { pickFaqTeaser, pickFeaturedArticles, pickFeaturedProducts, pickFeaturedTestimonials } from "./select";

export type HomePageProps = {
  products: Product[];
  categories: ProductCategory[];
  articles: Article[];
  testimonials: Testimonial[];
  faqs: Faq[];
  layout?: LayoutDocument;
  copy?: HomeCopy;
};

const savedLayout = validateLayout(layoutSource);

const FALLBACK_HERO_IMAGE = {
  src: "https://picsum.photos/seed/three-acts-hero/1318/608",
  alt: "A preview of a storefront built on Three Acts"
};

/**
 * The `/` route: hero, trust stats, "what's in the box" categories, featured
 * products, the "why Three Acts" story band, the black "from the journal"
 * band, agency testimonials, an FAQ teaser and a closing CTA — every section
 * a small component under `components/home/`, every data point sourced from
 * `@three-acts/content` / `@three-acts/ecommerce` loaders (see
 * `src/content/loaders.ts`).
 */
export function HomePage({ products, categories, articles, testimonials, faqs, layout = savedLayout, copy = sourceCopy }: HomePageProps) {
  const featuredProducts = pickFeaturedProducts(products, 6);
  const featuredArticles = pickFeaturedArticles(articles, 3);
  const featuredTestimonials = pickFeaturedTestimonials(testimonials, 3, 4);
  const faqTeaser = pickFaqTeaser(faqs, 4);
  const heroImage = featuredProducts[0]?.images[0] ?? FALLBACK_HERO_IMAGE;
  const rowImages = featuredProducts.flatMap((product) => product.images.slice(0, 1).map((image, index) => ({ ...image, cmsSource: { collectionId: "products", recordId: product.id, label: product.title, field: `images.${index}` } })));
  const page = layout.pages.home;
  const primaryHero = page.order.find(id => page.sections[id].type === "hero" && !page.sections[id].hidden);

  return (
    <>
      {!primaryHero && <h1 className="sr-only">{copy.hero_section.display_1}</h1>}
      {page.order.map(id => {
        const section = page.sections[id];
        const composition = homeSectionScope(id, section, copy, id === primaryHero);
        let content;
        switch (section.type) {
          case "hero": content = <HeroSection composition={composition} coverImage={heroImage} cmsSource={featuredProducts[0] ? { collectionId: "products", recordId: featuredProducts[0].id, label: featuredProducts[0].title } : undefined}/>; break;
          case "stats": content = <StatSection composition={composition}/>; break;
          case "categories": content = <ShopByCategorySection composition={composition} categories={categories}/>; break;
          case "products": content = <FeaturedProductsSection composition={composition} products={featuredProducts}/>; break;
          case "intro": content = <IntroSection composition={composition} images={rowImages}/>; break;
          case "journal": content = <JournalSection composition={composition} articles={featuredArticles}/>; break;
          case "testimonials": content = <TestimonialsSection composition={composition} testimonials={featuredTestimonials}/>; break;
          case "faq": content = <FaqTeaserSection composition={composition} faqs={faqTeaser}/>; break;
          case "cta": content = <CtaSection composition={composition}/>; break;
        }
        const name = `Layout.${section.type}`;
        return <div key={id} data-layout-page="home" data-layout-section={id} data-layout-type={section.type} data-layout-hidden={String(section.hidden)} hidden={section.hidden}
          data-editor-id={`layout.section.${id}`} {...componentAttributes(name, `layout.section.${id}`, {})}
          className={cn(componentClass(name, {}), section.hidden && "hidden")}>{content}</div>;
      })}
    </>
  );
}
