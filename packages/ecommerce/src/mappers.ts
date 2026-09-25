import { collectionRegistry, parseFileValue, parseImageGallery, parseImageValue, parseVideoValue } from "@three-acts/cms-schema";
import type { CmsRecord } from "@three-acts/cms-schema";
import { shopConfig } from "./config";
import type {
  Customer,
  ImageRef,
  Order,
  OrderLineItem,
  OrderPaymentStatus,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductAvailability,
  ProductCategory,
  ProductReview
} from "./models";
import { money } from "./pricing";

function collection(id: string) {
  const found = collectionRegistry.find((c) => c.id === id);
  if (!found) {
    throw new Error(`@three-acts/ecommerce: the collection registry has no "${id}" collection.`);
  }
  return found;
}

/**
 * Fails fast at module init when a field one of these mappers reads is
 * missing from `@three-acts/cms-schema`'s collection registry, so drift
 * between the two packages surfaces at import time rather than as a silent
 * `undefined` deep in a mapped record.
 */
function requireFields(collectionId: string, keys: readonly string[]): void {
  const fields = new Set(collection(collectionId).fields.map((f) => f.key));
  const missing = keys.filter((key) => !fields.has(key));
  if (missing.length > 0) {
    throw new Error(`@three-acts/ecommerce: collection "${collectionId}" is missing field(s): ${missing.join(", ")}.`);
  }
}

requireFields("products", [
  "title",
  "slug",
  "sku",
  "category",
  "price",
  "compareAtPrice",
  "currency",
  "inventory",
  "availability",
  "shortDescription",
  "description",
  "images",
  "productVideo",
  "specSheet",
  "weightGrams",
  "tags",
  "featured"
]);

requireFields("product-categories", ["name", "slug", "description", "image", "sortOrder"]);

// Reads a subset of product-reviews fields; "customerEmail", "approved" and
// "source" exist on the registry but aren't part of the `ProductReview`
// read model, so they're intentionally not validated or mapped here.
requireFields("product-reviews", ["title", "product", "customerName", "rating", "body", "verifiedPurchase", "submittedAt"]);

requireFields("orders", [
  "orderNumber",
  "customerEmail",
  "customerName",
  "status",
  "paymentStatus",
  "paymentMethod",
  "itemCount",
  "items",
  "subtotal",
  "discountTotal",
  "discountCode",
  "taxTotal",
  "shippingTotal",
  "total",
  "currency",
  "placedAt",
  "shippingCity",
  "shippingCountry",
  "trackingNumber",
  "shippingName",
  "shippingAddress",
  "shippingPostalCode"
]);

requireFields("customers", [
  "name",
  "email",
  "phone",
  "address",
  "city",
  "postalCode",
  "country",
  "marketingOptIn",
  "totalOrders",
  "lifetimeValue",
  "firstOrderAt",
  "lastOrderAt"
]);

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function boolValue(value: unknown): boolean {
  return value === true;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const text = stringValue(value);
  return (allowed as readonly string[]).includes(text) ? (text as T) : fallback;
}

function toImageRef(value: { src: string; alt?: string; width?: number; height?: number } | null): ImageRef | undefined {
  if (!value || !value.src) {
    return undefined;
  }
  const ref: ImageRef = { src: value.src, alt: value.alt ?? "" };
  if (value.width !== undefined) ref.width = value.width;
  if (value.height !== undefined) ref.height = value.height;
  return ref;
}

const availabilityValues: readonly ProductAvailability[] = ["in_stock", "low_stock", "out_of_stock", "preorder", "discontinued"];
const orderStatusValues: readonly OrderStatus[] = ["pending", "paid", "fulfilled", "shipped", "refunded", "cancelled"];
const paymentStatusValues: readonly OrderPaymentStatus[] = ["awaiting", "authorized", "paid", "partially_refunded", "refunded", "failed"];
const paymentMethodValues: readonly PaymentMethod[] = ["card", "eft", "paypal", "apple_pay", "gift_card"];

export function toProduct(record: CmsRecord): Product {
  const v = record.values;
  const images = parseImageGallery(v.images)
    .map((image) => toImageRef(image))
    .filter((image): image is ImageRef => image !== undefined);
  const video = parseVideoValue(v.productVideo);
  const spec = parseFileValue(v.specSheet);
  const compareAtPrice = numberValue(v.compareAtPrice);
  const tags = stringValue(v.tags)
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  const product: Product = {
    id: record.id,
    slug: stringValue(v.slug),
    sku: stringValue(v.sku),
    title: stringValue(v.title),
    categorySlug: stringValue(v.category),
    price: numberValue(v.price),
    currency: stringValue(v.currency) || shopConfig.currency,
    inventory: numberValue(v.inventory),
    availability: enumValue(v.availability, availabilityValues, "out_of_stock"),
    shortDescription: stringValue(v.shortDescription),
    description: stringValue(v.description),
    images,
    weightGrams: numberValue(v.weightGrams),
    tags,
    featured: boolValue(v.featured)
  };
  if (compareAtPrice > 0) {
    product.compareAtPrice = compareAtPrice;
  }
  if (video) {
    product.video = { src: video.src, contentType: video.contentType ?? "" };
  }
  if (spec) {
    product.specSheet = { src: spec.src, fileName: spec.fileName ?? "" };
  }
  return product;
}

export function toProductCategory(record: CmsRecord): ProductCategory {
  const v = record.values;
  const image = toImageRef(parseImageValue(v.image));
  const category: ProductCategory = {
    id: record.id,
    slug: stringValue(v.slug),
    name: stringValue(v.name),
    description: stringValue(v.description),
    sortOrder: numberValue(v.sortOrder)
  };
  if (image) {
    category.image = image;
  }
  return category;
}

export function toProductReview(record: CmsRecord): ProductReview {
  const v = record.values;
  return {
    id: record.id,
    productSlug: stringValue(v.product),
    title: stringValue(v.title),
    customerName: stringValue(v.customerName),
    rating: numberValue(v.rating),
    body: stringValue(v.body),
    verifiedPurchase: boolValue(v.verifiedPurchase),
    submittedAt: stringValue(v.submittedAt)
  };
}

/**
 * Parses the JSON stored in an order's `items` field into `OrderLineItem[]`.
 * Lenient by design (checkout writes it, but the CMS shows a raw textarea):
 * `""`, invalid JSON, and anything that isn't a JSON array all yield `[]`,
 * and individual entries missing a usable `slug`/`title`/`quantity`/`unitPrice`
 * are dropped rather than failing the whole parse.
 */
export function parseOrderItems(value: unknown): OrderLineItem[] {
  let candidate: unknown = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      candidate = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(candidate)) {
    return [];
  }

  const items: OrderLineItem[] = [];
  for (const raw of candidate) {
    if (typeof raw !== "object" || raw === null) {
      continue;
    }
    const r = raw as Record<string, unknown>;
    const slug = stringValue(r.slug);
    const title = stringValue(r.title);
    if (!slug || !title) {
      continue;
    }
    if (typeof r.quantity !== "number" || !Number.isFinite(r.quantity)) {
      continue;
    }
    if (typeof r.unitPrice !== "number" || !Number.isFinite(r.unitPrice)) {
      continue;
    }
    const quantity = r.quantity;
    const unitPrice = r.unitPrice;
    const lineTotal = typeof r.lineTotal === "number" && Number.isFinite(r.lineTotal) ? r.lineTotal : money(unitPrice * quantity);
    const item: OrderLineItem = {
      slug,
      sku: stringValue(r.sku),
      title,
      quantity,
      unitPrice,
      lineTotal,
      currency: stringValue(r.currency) || shopConfig.currency
    };
    if (typeof r.image === "string" && r.image) {
      item.image = r.image;
    }
    items.push(item);
  }
  return items;
}

/** Serializes line items back to the compact JSON the `orders.items` field stores. */
export function serializeOrderItems(items: readonly OrderLineItem[]): string {
  return JSON.stringify(items);
}

export function toOrder(record: CmsRecord): Order {
  const v = record.values;
  const items = parseOrderItems(v.items);
  const subtotal = numberValue(v.subtotal);
  const shippingTotal = numberValue(v.shippingTotal);
  const merchandiseInclVat =
    items.length > 0 ? money(items.reduce((sum, item) => sum + item.lineTotal, 0)) : money(subtotal * (1 + shopConfig.vatRate));

  return {
    id: record.id,
    orderNumber: stringValue(v.orderNumber),
    customerEmail: stringValue(v.customerEmail),
    customerName: stringValue(v.customerName),
    status: enumValue(v.status, orderStatusValues, "pending"),
    paymentStatus: enumValue(v.paymentStatus, paymentStatusValues, "awaiting"),
    paymentMethod: enumValue(v.paymentMethod, paymentMethodValues, "card"),
    items,
    currency: stringValue(v.currency) || shopConfig.currency,
    itemCount: numberValue(v.itemCount),
    merchandiseInclVat,
    subtotal,
    discountTotal: numberValue(v.discountTotal),
    taxTotal: numberValue(v.taxTotal),
    shippingTotal,
    total: numberValue(v.total),
    freeShipping: shippingTotal === 0,
    discountCode: stringValue(v.discountCode),
    placedAt: stringValue(v.placedAt),
    shippingName: stringValue(v.shippingName),
    shippingAddress: stringValue(v.shippingAddress),
    shippingCity: stringValue(v.shippingCity),
    shippingPostalCode: stringValue(v.shippingPostalCode),
    shippingCountry: stringValue(v.shippingCountry),
    trackingNumber: stringValue(v.trackingNumber)
  };
}

export function toCustomer(record: CmsRecord): Customer {
  const v = record.values;
  const customer: Customer = {
    id: record.id,
    name: stringValue(v.name),
    email: stringValue(v.email),
    phone: stringValue(v.phone),
    address: stringValue(v.address),
    city: stringValue(v.city),
    postalCode: stringValue(v.postalCode),
    country: stringValue(v.country),
    marketingOptIn: boolValue(v.marketingOptIn),
    totalOrders: numberValue(v.totalOrders),
    lifetimeValue: numberValue(v.lifetimeValue)
  };
  const firstOrderAt = stringValue(v.firstOrderAt);
  const lastOrderAt = stringValue(v.lastOrderAt);
  if (firstOrderAt) customer.firstOrderAt = firstOrderAt;
  if (lastOrderAt) customer.lastOrderAt = lastOrderAt;
  return customer;
}
