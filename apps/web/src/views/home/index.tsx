import type { Article, Faq, Testimonial } from "@three-acts/content";
import type { Product, ProductCategory } from "@three-acts/ecommerce";
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

type HomePageProps = {
  products: Product[];
  categories: ProductCategory[];
  articles: Article[];
  testimonials: Testimonial[];
  faqs: Faq[];
};

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
export function HomePage({ products, categories, articles, testimonials, faqs }: HomePageProps) {
  const featuredProducts = pickFeaturedProducts(products, 6);
  const featuredArticles = pickFeaturedArticles(articles, 3);
  const featuredTestimonials = pickFeaturedTestimonials(testimonials, 3, 4);
  const faqTeaser = pickFaqTeaser(faqs, 4);
  const heroImage = featuredProducts[0]?.images[0] ?? FALLBACK_HERO_IMAGE;
  const rowImages = featuredProducts.flatMap((product) => product.images.slice(0, 1));

  return (
    <>
      <HeroSection coverImage={heroImage} />
      <StatSection />
      <ShopByCategorySection categories={categories} />
      <FeaturedProductsSection products={featuredProducts} />
      <IntroSection images={rowImages} />
      <JournalSection articles={featuredArticles} />
      <TestimonialsSection testimonials={featuredTestimonials} />
      <FaqTeaserSection faqs={faqTeaser} />
      <CtaSection />
    </>
  );
}
