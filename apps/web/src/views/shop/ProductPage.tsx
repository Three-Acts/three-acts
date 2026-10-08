import { cmsAttributes } from "@three-acts/cms-schema";
import { elementClass } from "../../lib/design";
/* eslint-disable react-refresh/only-export-components */
import type { Faq } from "@three-acts/content";
import type { Product, ProductCategory } from "@three-acts/ecommerce";
import copy from "@three-acts/static-content/documents/product-template.json";
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
    <div data-editor-base-class={"flex flex-col gap-3"} data-editor-id="source.ProductPage.1" className={elementClass("source.ProductPage.1", "flex flex-col gap-3")}>
      {category && (
        <a data-editor-base-class={"focus-ring w-fit text-small uppercase tracking-eyebrow text-ink hover:underline"} data-editor-id="source.ProductPage.2" href={`/shop/category/${category.slug}`} {...cmsAttributes({ collectionId: "product-categories", recordId: category.id, label: category.name }, "slug")} className={elementClass("source.ProductPage.2", "focus-ring w-fit text-small uppercase tracking-eyebrow text-ink hover:underline")}>
          <span data-editor-base-class={""} data-editor-id="source.ProductPage.3" className={elementClass("source.ProductPage.3", "")} {...cmsAttributes({ collectionId: "product-categories", recordId: category.id, label: category.name }, "name")}>{category.name}</span>
        </a>
      )}
      <Typography.Title data-editor-id="source.ProductPage.4" as="h1" {...cmsAttributes({ collectionId: "products", recordId: product.id, label: product.title }, "title")}>{product.title}</Typography.Title>
    </div>
  );
}

/** Price (with compare-at), availability badge, SKU and the short description. */
function Pricing({ product }: { product: Product }) {
  return (
    <div data-editor-base-class={"flex flex-col gap-3"} data-editor-id="source.ProductPage.5" className={elementClass("source.ProductPage.5", "flex flex-col gap-3")}>
      <div data-editor-base-class={"flex flex-wrap items-center gap-3"} data-editor-id="source.ProductPage.6" className={elementClass("source.ProductPage.6", "flex flex-wrap items-center gap-3")}>
        <Price.Root {...cmsAttributes({ collectionId: "products", recordId: product.id, label: product.title }, "price")} amount={product.price} compareAtPrice={product.compareAtPrice} currency={product.currency} />
        <span data-editor-base-class={""} data-editor-id="source.ProductPage.7" className={elementClass("source.ProductPage.7", "")} {...cmsAttributes({ collectionId: "products", recordId: product.id, label: product.title }, "availability")}>
          <AvailabilityBadge product={product} />
        </span>
      </div>
      <p data-editor-base-class={"text-small uppercase tracking-eyebrow text-ink"} data-editor-id="source.ProductPage.8" className={elementClass("source.ProductPage.8", "text-small uppercase tracking-eyebrow text-ink")}><span data-editor-base-class={""} data-editor-id="product-template.sku_label" className={elementClass("product-template.sku_label", "")} data-static-field="product-template.sku_label">{copy.sku_label}</span> <span data-editor-base-class={""} data-editor-id="source.ProductPage.9" className={elementClass("source.ProductPage.9", "")} {...cmsAttributes({ collectionId: "products", recordId: product.id, label: product.title }, "sku")}>{product.sku}</span></p>
      <p data-editor-base-class={"text-body text-ink"} data-editor-id="source.ProductPage.10" className={elementClass("source.ProductPage.10", "text-body text-ink")} {...cmsAttributes({ collectionId: "products", recordId: product.id, label: product.title }, "shortDescription")}>{product.shortDescription}</p>
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
    <div data-editor-base-class={"flex flex-col gap-3 border border-line-strong bg-surface p-6"} data-editor-id="source.ProductPage.11" className={elementClass("source.ProductPage.11", "flex flex-col gap-3 border border-line-strong bg-surface p-6")}>
      <p data-editor-base-class={"text-small font-medium uppercase tracking-eyebrow text-ink"} data-editor-id="product-template.what_you_get" className={elementClass("product-template.what_you_get", "text-small font-medium uppercase tracking-eyebrow text-ink")} data-static-field="product-template.what_you_get">{copy.what_you_get}</p>
      <ul data-editor-base-class={"flex flex-col gap-2"} data-editor-id="source.ProductPage.12" className={elementClass("source.ProductPage.12", "flex flex-col gap-2")}>
        {rows.map((row) => (
          <li data-editor-base-class={"grid grid-cols-check items-start gap-3 text-body text-ink"} data-editor-id="source.ProductPage.13" key={row} className={elementClass("source.ProductPage.13", "grid grid-cols-check items-start gap-3 text-body text-ink")}>
            <span data-editor-base-class={"mt-0.5 flex size-6 shrink-0 items-center justify-center border border-line-strong text-small"} data-editor-id="source.ProductPage.14" aria-hidden="true" className={elementClass("source.ProductPage.14", "mt-0.5 flex size-6 shrink-0 items-center justify-center border border-line-strong text-small")}>
              ✓
            </span>
            <span data-editor-base-class={""} data-editor-id="source.ProductPage.15" className={elementClass("source.ProductPage.15", "")}>{row}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The "what you get" list, spec sheet/video download when present, the full Prose description and tags — everything after the add-to-cart control. */
function Details({ product, category }: { product: Product; category?: ProductCategory }) {
  return (
    <div data-editor-base-class={"flex flex-col gap-6"} data-editor-id="source.ProductPage.16" className={elementClass("source.ProductPage.16", "flex flex-col gap-6")}>
      <WhatYouGet product={product} category={category} />

      {product.specSheet && (
        <a data-editor-base-class={"focus-ring inline-flex w-fit items-center gap-2 text-body text-ink underline decoration-1 underline-offset-2 hover:no-underline"} data-editor-id="source.ProductPage.17"
          href={product.specSheet.src}
          {...cmsAttributes({ collectionId: "products", recordId: product.id, label: product.title }, "specSheet.src")}
          download={product.specSheet.fileName || ""}
          className={elementClass("source.ProductPage.17", "focus-ring inline-flex w-fit items-center gap-2 text-body text-ink underline decoration-1 underline-offset-2 hover:no-underline")}
        >
          <span data-editor-base-class={""} data-editor-id="product-template.download_spec_sheet" className={elementClass("product-template.download_spec_sheet", "")} data-static-field="product-template.download_spec_sheet">{copy.download_spec_sheet}</span>
        </a>
      )}

      {product.video && (
        <video data-editor-base-class={"aspect-video w-full border border-line-strong bg-block"} data-editor-id="source.ProductPage.18" controls preload="metadata" className={elementClass("source.ProductPage.18", "aspect-video w-full border border-line-strong bg-block")} {...cmsAttributes({ collectionId: "products", recordId: product.id, label: product.title }, "productVideo")}>
          <source data-editor-base-class={""} data-editor-id="source.ProductPage.19" className={elementClass("source.ProductPage.19", "")} src={product.video.src} type={product.video.contentType || undefined} />
        </video>
      )}

      <Prose.Root body={product.description} {...cmsAttributes({ collectionId: "products", recordId: product.id, label: product.title }, "description")} />

      {product.tags.length > 0 && (
        <ul data-editor-base-class={"flex flex-wrap gap-2"} data-editor-id="source.ProductPage.20" className={elementClass("source.ProductPage.20", "flex flex-wrap gap-2")}>
          {product.tags.map((tag) => (
            <li data-editor-base-class={""} data-editor-id="source.ProductPage.21" className={elementClass("source.ProductPage.21", "")} key={tag} {...cmsAttributes({ collectionId: "products", recordId: product.id, label: product.title }, "tags")}>
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
    <Section.Root data-editor-id="source.ProductPage.22">
      <Section.Container data-editor-id="source.ProductPage.23" className="max-w-3xl">
        <Section.Header
          title={<span data-editor-base-class={""} data-editor-id="product-template.questions" className={elementClass("product-template.questions", "")} data-static-field="product-template.questions">{copy.questions}</span>}
          action={
            <Button.Link data-editor-id="product-template.see_all_faqs_href" data-static-field="product-template.see_all_faqs_href" data-static-attribute="href" href={copy.see_all_faqs_href} variant="ghost" icon="arrow">
              <span data-editor-base-class={""} data-editor-id="product-template.see_all_faqs" className={elementClass("product-template.see_all_faqs", "")} data-static-field="product-template.see_all_faqs">{copy.see_all_faqs}</span>
            </Button.Link>
          }
        />
        <div data-editor-base-class={"flex flex-col border-t border-line-strong"} data-editor-id="source.ProductPage.24" className={elementClass("source.ProductPage.24", "flex flex-col border-t border-line-strong")}>
          {items.map((faq) => (
            <details data-editor-base-class={"group border-b border-line-strong py-5"} data-editor-id="source.ProductPage.25" key={faq.id} className={elementClass("source.ProductPage.25", "group border-b border-line-strong py-5")}>
              <summary data-editor-base-class={"focus-ring flex cursor-pointer list-none items-center justify-between gap-4 text-body font-medium text-ink [&::-webkit-details-marker]:hidden"} data-editor-id="source.ProductPage.26" className={elementClass("source.ProductPage.26", "focus-ring flex cursor-pointer list-none items-center justify-between gap-4 text-body font-medium text-ink [&::-webkit-details-marker]:hidden")}>
                <span data-editor-base-class={""} data-editor-id="source.ProductPage.27" className={elementClass("source.ProductPage.27", "")} {...cmsAttributes({ collectionId: "faqs", recordId: faq.id, label: faq.question }, "question")}>{faq.question}</span>
                <span data-editor-base-class={"shrink-0 text-h3 leading-none text-ink"} data-editor-id="source.ProductPage.28" aria-hidden="true" className={elementClass("source.ProductPage.28", "shrink-0 text-h3 leading-none text-ink")}>
                  +
                </span>
              </summary>
              <div data-editor-base-class={"mt-4"} data-editor-id="source.ProductPage.29" className={elementClass("source.ProductPage.29", "mt-4")} {...cmsAttributes({ collectionId: "faqs", recordId: faq.id, label: faq.question }, "answer")}>
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
    <Section.Root data-editor-id="source.ProductPage.30">
      <Section.Container data-editor-id="source.ProductPage.31">
        <Section.Header title={<span data-editor-base-class={""} data-editor-id="product-template.related_pieces" className={elementClass("product-template.related_pieces", "")} data-static-field="product-template.related_pieces">{copy.related_pieces}</span>} />
        <div data-editor-base-class={""} data-editor-id="source.ProductPage.32" className={elementClass("source.ProductPage.32", "")} data-cms-bound="products.related">
          <ProductGrid products={products} />
        </div>
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
