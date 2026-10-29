/* eslint-disable react-refresh/only-export-components */
import type { Faq } from "@three-acts/content";
import type { Product, ProductCategory } from "@three-acts/ecommerce";
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
        <a href={`/shop/category/${category.slug}`} className="focus-ring w-fit text-small uppercase tracking-eyebrow text-ink hover:underline">
          {category.name}
        </a>
      )}
      <Typography.Title as="h1">{product.title}</Typography.Title>
    </div>
  );
}

/** Price (with compare-at), availability badge, SKU and the short description. */
function Pricing({ product }: { product: Product }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Price.Root amount={product.price} compareAtPrice={product.compareAtPrice} currency={product.currency} />
        <AvailabilityBadge product={product} />
      </div>
      <p className="text-small uppercase tracking-eyebrow text-ink">SKU: {product.sku}</p>
      <p className="text-body text-ink">{product.shortDescription}</p>
    </div>
  );
}

/**
 * The "what you get" rows for a product's category — repo access / updates /
 * licence scope for the buildable pieces, a licence product's own terms, a
 * service's delivery model, or a bundle's pointer down to its own contents.
 */
function whatYouGetRows(product: Product, category?: ProductCategory): string[] {
  switch (category?.slug) {
    case "licenses":
      if (product.tags.includes("unlimited")) {
        return ["Unlimited sites, unlimited seats", "No expiry — pay once", "Delivered as a signed licence record"];
      }
      if (product.tags.includes("agency")) {
        return ["Unlimited client sites for one agency", "No expiry — pay once", "Delivered as a signed licence record"];
      }
      return ["Covers one production site", "No expiry — pay once", "Delivered as a signed licence record"];
    case "services":
      return ["Delivered remotely", "Scheduled after purchase"];
    case "bundles":
      return ["Everything listed below"];
    default:
      return ["Source in the template repo", "Updates for 12 months", "Use on one client site per licence"];
  }
}

/** A bordered "what you get" box: a checked row per entitlement, derived from the product's category. */
function WhatYouGet({ product, category }: { product: Product; category?: ProductCategory }) {
  const rows = whatYouGetRows(product, category);
  return (
    <div className="flex flex-col gap-3 border border-line-strong bg-surface p-6">
      <p className="text-small font-medium uppercase tracking-eyebrow text-ink">What you get</p>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row} className="grid grid-cols-check items-start gap-3 text-body text-ink">
            <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center border border-line-strong text-small">
              ✓
            </span>
            <span>{row}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The "what you get" list, spec sheet/video download when present, the full Prose description and tags — everything after the add-to-cart control. */
function Details({ product, category }: { product: Product; category?: ProductCategory }) {
  return (
    <div className="flex flex-col gap-6">
      <WhatYouGet product={product} category={category} />

      {product.specSheet && (
        <a
          href={product.specSheet.src}
          download={product.specSheet.fileName || ""}
          className="focus-ring inline-flex w-fit items-center gap-2 text-body text-ink underline decoration-1 underline-offset-2 hover:no-underline"
        >
          Download spec sheet
        </a>
      )}

      {product.video && (
        <video controls preload="metadata" className="aspect-video w-full border border-line-strong bg-block">
          <source src={product.video.src} type={product.video.contentType || undefined} />
        </video>
      )}

      <Prose.Root body={product.description} />

      {product.tags.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {product.tags.map((tag) => (
            <li key={tag}>
              <Badge.Root>{tag}</Badge.Root>
            </li>
          ))}
        </ul>
      )}
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
        <Section.Header
          title="Questions"
          action={
            <Button.Link href="/faq" variant="ghost" icon="arrow">
              See all FAQs
            </Button.Link>
          }
        />
        <div className="flex flex-col border-t border-line-strong">
          {items.map((faq) => (
            <details key={faq.id} className="group border-b border-line-strong py-5">
              <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 text-body font-medium text-ink [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span aria-hidden="true" className="shrink-0 text-h3 leading-none text-ink">
                  +
                </span>
              </summary>
              <div className="mt-4">
                <Prose.Root body={faq.answer} />
              </div>
            </details>
          ))}
        </div>
      </Section.Container>
    </Section.Root>
  );
}

/** "Related pieces" — the related-products grid. Renders nothing when there are none. */
function Related({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return null;
  }
  return (
    <Section.Root>
      <Section.Container>
        <Section.Header title="Related pieces" />
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
