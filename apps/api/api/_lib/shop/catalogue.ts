import type { CmsRecord } from "@three-acts/cms-schema";
import {
  parseOrderItems,
  toProduct,
  toProductReview,
  type Discount,
  type DiscountKind,
  type Product,
  type ProductReview,
  type SubmitReviewRequest
} from "@three-acts/ecommerce";
import { ApiError } from "../http";
import { createSystemRecord, findRecords, listPublishedRecords } from "../cms/service";

/**
 * Live products the storefront can show: `products` is an `editorial`-mode
 * collection, so `listPublishedRecords` already serves the live snapshot
 * (never an editor's unpublished draft). A product still shows up here while
 * `availability` is `out_of_stock`/`preorder`/`low_stock` — only
 * `discontinued` products are excluded entirely, matching the spec.
 */
export async function listLiveProducts(): Promise<Product[]> {
  const { records } = await listPublishedRecords("products", {});
  return records.map(toProduct).filter((product) => product.availability !== "discontinued");
}

/** A single live product by slug, or `undefined` when it doesn't exist, isn't published, or is discontinued. */
export async function getLiveProduct(slug: string): Promise<Product | undefined> {
  const products = await listLiveProducts();
  return products.find((product) => product.slug === slug);
}

/**
 * Approved reviews for a product, newest submission first. `product-reviews`
 * is a `data`-mode collection (moderated by the `approved` flag, not a
 * publish workflow), so this reads straight from the store via `findRecords`
 * rather than `listPublishedRecords`.
 */
export async function listApprovedReviews(slug: string): Promise<ProductReview[]> {
  const records = await findRecords("product-reviews", (record) => record.values.product === slug && record.values.approved === true);
  return records.map(toProductReview).sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : a.submittedAt > b.submittedAt ? -1 : 0));
}

/** Whether `email` has a paid order that includes `slug` among its line items — the review route's `verifiedPurchase`, never trusted from the client. */
export async function hasVerifiedPurchase(slug: string, email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const orders = await findRecords(
    "orders",
    (record) => String(record.values.customerEmail ?? "").trim().toLowerCase() === normalizedEmail && record.values.paymentStatus === "paid"
  );
  return orders.some((order) => parseOrderItems(order.values.items).some((item) => item.slug === slug));
}

function reviewFail(message: string): never {
  throw new ApiError(400, "validation_error", message);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Parses and validates an unknown POST body into a `SubmitReviewRequest`. Throws `ApiError(400, "validation_error", ...)` on the first problem found. */
export function validateSubmitReview(body: unknown): SubmitReviewRequest {
  if (!body || typeof body !== "object") reviewFail("Request body must be an object.");
  const input = body as Record<string, unknown>;

  if (!isNonBlankString(input.title) || input.title.trim().length > 120) reviewFail("title is required and must be at most 120 characters.");
  if (!isNonBlankString(input.customerName) || input.customerName.trim().length > 80) {
    reviewFail("customerName is required and must be at most 80 characters.");
  }
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) reviewFail("rating must be a whole number between 1 and 5.");
  if (!isNonBlankString(input.body) || input.body.trim().length > 3000) reviewFail("body is required and must be at most 3000 characters.");

  const review: SubmitReviewRequest = {
    title: input.title.trim(),
    customerName: input.customerName.trim(),
    rating: rating as 1 | 2 | 3 | 4 | 5,
    body: input.body.trim()
  };
  if (isNonBlankString(input.customerEmail)) {
    const email = input.customerEmail.trim();
    if (!isValidEmail(email)) reviewFail("customerEmail must be a valid email address.");
    review.customerEmail = email;
  }
  return review;
}

/**
 * Validates and stores a customer-submitted review: always `approved: false`
 * and `source: "site"` (only staff-added CMS reviews default to "manual"),
 * with `verifiedPurchase` computed server-side from a matching paid order
 * rather than trusted from the request.
 */
export async function submitReview(slug: string, body: unknown): Promise<ProductReview> {
  const input = validateSubmitReview(body);
  const verifiedPurchase = input.customerEmail ? await hasVerifiedPurchase(slug, input.customerEmail) : false;

  const record = await createSystemRecord("product-reviews", {
    title: input.title,
    product: slug,
    customerName: input.customerName,
    customerEmail: input.customerEmail ?? "",
    rating: String(input.rating),
    body: input.body,
    verifiedPurchase,
    approved: false,
    source: "site",
    submittedAt: new Date().toISOString()
  });

  return toProductReview(record);
}

export type DiscountLookup = { discount: Discount; record: CmsRecord } | { reason: string };

function parseDate(value: unknown): number | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return undefined;
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? undefined : parsed;
}

const discountKinds: readonly DiscountKind[] = ["percentage", "fixed_amount", "free_shipping"];

/**
 * `@three-acts/ecommerce` doesn't map `discount-codes` (it isn't a
 * storefront read model shared with the client the way products/orders are —
 * `Discount` only ever travels inside a priced response), so this record ->
 * `Discount` mapping lives here instead of in the package's `mappers.ts`.
 */
function toDiscount(record: CmsRecord): Discount {
  const kindRaw = String(record.values.discountType ?? "");
  const kind = discountKinds.includes(kindRaw as DiscountKind) ? (kindRaw as DiscountKind) : "percentage";
  return {
    code: String(record.values.code ?? ""),
    kind,
    amount: Number(record.values.amount ?? 0),
    minimumSubtotal: Number(record.values.minimumSubtotal ?? 0)
  };
}

/**
 * Looks up a discount code (case/whitespace-insensitive) and checks whether
 * it can currently be redeemed: `active`, inside its `startsAt`/`endsAt`
 * window (either bound may be blank), and under `usageLimit` (`0` means
 * unlimited). Returns the record alongside the mapped `Discount` so callers
 * (checkout) can increment `timesUsed` without a second lookup.
 */
export async function findDiscount(code: string): Promise<DiscountLookup> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return { reason: "Enter a discount code." };
  }

  const records = await findRecords("discount-codes", (record) => String(record.values.code ?? "").trim().toUpperCase() === normalized);
  const record = records[0];
  if (!record) {
    return { reason: "That discount code doesn't exist." };
  }

  if (record.values.active !== true) {
    return { reason: "That discount code is no longer active." };
  }

  const now = Date.now();
  const startsAt = parseDate(record.values.startsAt);
  if (startsAt !== undefined && now < startsAt) {
    return { reason: "That discount code isn't active yet." };
  }
  const endsAt = parseDate(record.values.endsAt);
  if (endsAt !== undefined && now > endsAt) {
    return { reason: "That discount code has expired." };
  }

  const usageLimit = Number(record.values.usageLimit ?? 0);
  const timesUsed = Number(record.values.timesUsed ?? 0);
  if (usageLimit > 0 && timesUsed >= usageLimit) {
    return { reason: "That discount code has reached its usage limit." };
  }

  return { discount: toDiscount(record), record };
}
