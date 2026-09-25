/* eslint-disable react-refresh/only-export-components */
import type { Faq } from "@three-acts/content";
import { formatMoney, shopConfig, type Product, type ProductCategory } from "@three-acts/ecommerce";
import { ProductGrid } from "../../components/shop/product-grid";
import { AvailabilityBadge } from "../../components/shop/availability-badge";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Price } from "../../components/ui/price";
import { Prose } from "../../components/ui/prose";
import { Typography } from "../../components/ui/typography";
import { Section } from "../../components/layout/section";

/**
 * `/shop/[slug]`'s static content, split into small pieces rather than one
 * component (dot-notation, matching the rest of the UI kit) because the
 * page's right column interleaves two islands — the review-count summary
 * and the add-to-cart control — between these static blocks. `pages/shop/
 * [slug].astro` renders `Header`, the summary island, `Pricing`, the
 * add-to-cart island, then `Details` as siblings in one flex column, so the
 * document order alone produces the right layout with no JSX passed as a
 * prop from `.astro` (see the storefront build contract's gotchas).
 */

type HeaderProps = { product: Product; category?: ProductCategory };

/** Category link (when the product's category resolved) + the product's `<h1>`. */
function Header({ product, category }: HeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      {category && (
        <a href={`/shop/category/${category.slug}`} className="focus-ring text-xs font-semibold uppercase tracking-eyebrow text-moss hover:text-ink">
          {category.name}
        </a>
      )}
      <Typography.Title as="h1">{product.title}</Typography.Title>
    </div>
  );
}

/** Price (with compare-at), availability badge, SKU and the short marketing description. */
function Pricing({ product }: { product: Product }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Price.Root amount={product.price} compareAtPrice={product.compareAtPrice} currency={product.currency} />
        <AvailabilityBadge product={product} />
      </div>
      <p className="text-xs uppercase tracking-eyebrow text-muted">SKU: {product.sku}</p>
      <p className="text-base leading-7 text-ink">{product.shortDescription}</p>
    </div>
  );
}

/** Shipping note, spec sheet link, full description, video, tags and weight — everything after the add-to-cart control. */
function Details({ product }: { product: Product }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">Free delivery over {formatMoney(shopConfig.shipping.freeOverInclVat, shopConfig.currency)}.</p>

      {product.specSheet && (
        <a
          href={product.specSheet.src}
          download={product.specSheet.fileName || ""}
          className="focus-ring inline-flex w-fit items-center gap-2 text-sm font-medium text-ink underline decoration-1 underline-offset-2 hover:text-accent"
        >
          Download spec sheet
        </a>
      )}

      <Prose.Root body={product.description} />

      {product.video && (
        // Product demo b-roll: silent, no dialogue/narration to caption.
        <video controls preload="metadata" className="w-full border border-line">
          <source src={product.video.src} type={product.video.contentType || undefined} />
        </video>
      )}

      {product.tags.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {product.tags.map((tag) => (
            <li key={tag}>
              <Badge.Root>{tag}</Badge.Root>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">Weight: {product.weightGrams} g</p>
    </div>
  );
}

/** "Questions" — up to 4 `topic: "products"` FAQs as a zero-JS `<details>` disclosure list, linking to the full `/faq` page. */
function Questions({ faqs }: { faqs: Faq[] }) {
  const items = faqs.filter((faq) => faq.topic === "products").slice(0, 4);
  if (items.length === 0) {
    return null;
  }
  return (
    <Section.Root>
      <Section.Container className="max-w-3xl">
        <Section.Header title="Questions" action={<Button.Link href="/faq" variant="ghost">See all FAQs →</Button.Link>} />
        <div className="flex flex-col divide-y divide-line border-y border-line">
          {items.map((faq) => (
            <details key={faq.id} className="group py-5">
              <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span aria-hidden="true" className="shrink-0 text-lg text-muted transition-transform duration-150 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted">{faq.answer}</p>
            </details>
          ))}
        </div>
      </Section.Container>
    </Section.Root>
  );
}

/** "You might also like" — the related-products grid. Renders nothing when there are none. */
function Related({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return null;
  }
  return (
    <Section.Root>
      <Section.Container>
        <Section.Header title="You might also like" />
        <ProductGrid products={products} />
      </Section.Container>
    </Section.Root>
  );
}

export const ProductPage = {
  Header,
  Pricing,
  Details,
  Questions,
  Related
};

export default ProductPage;
