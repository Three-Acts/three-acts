import type { Article, Faq, Testimonial } from "@three-acts/content";
import type { Product, ProductCategory } from "@three-acts/ecommerce";
import { FaqTeaserSection } from "../../components/home/faq-teaser-section";
import { FeaturedProductsSection } from "../../components/home/featured-products-section";
import { HeroSection } from "../../components/home/hero-section";
import { JournalSection } from "../../components/home/journal-section";
import { NewsletterSection } from "../../components/home/newsletter-section";
import { RoasteryBandSection } from "../../components/home/roastery-band-section";
import { ShopByCategorySection } from "../../components/home/shop-by-category-section";
import { TestimonialsSection } from "../../components/home/testimonials-section";
import { countOrigins, pickFaqTeaser, pickFeaturedArticles, pickFeaturedProducts, pickFeaturedTestimonials } from "./select";

type HomePageProps = {
  products: Product[];
  categories: ProductCategory[];
  articles: Article[];
  testimonials: Testimonial[];
  faqs: Faq[];
};

const HERO_IMAGE = {
  src: "https://picsum.photos/seed/ff-home-hero/1200/1400",
  alt: "Fresh coffee beans cooling on the roaster tray at Fynbos & Fire"
};

/**
 * The `/` route: hero, shop-by-category, featured products, the dark
 * "roastery" story band, journal picks, testimonials, an FAQ teaser and a
 * newsletter callout — every section a small component under
 * `components/home/`, every data point sourced from `@three-acts/content` /
 * `@three-acts/ecommerce` loaders (see `src/content/loaders.ts`).
 */
export function HomePage({ products, categories, articles, testimonials, faqs }: HomePageProps) {
  const featuredProducts = pickFeaturedProducts(products, 6);
  const featuredArticles = pickFeaturedArticles(articles, 3);
  const featuredTestimonials = pickFeaturedTestimonials(testimonials, 3, 4);
  const faqTeaser = pickFaqTeaser(faqs, 4);
  const originCount = countOrigins(products);

  return (
    <>
      <HeroSection productCount={products.length} originCount={originCount} coverImage={HERO_IMAGE} />
      <ShopByCategorySection categories={categories} />
      <FeaturedProductsSection products={featuredProducts} />
      <RoasteryBandSection />
      <JournalSection articles={featuredArticles} />
      <TestimonialsSection testimonials={featuredTestimonials} />
      <FaqTeaserSection faqs={faqTeaser} />
      <NewsletterSection />
    </>
  );
}
