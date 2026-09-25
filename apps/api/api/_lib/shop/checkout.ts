import type { AuthUser } from "@three-acts/auth";
import type { CmsRecord, CmsRecordValue } from "@three-acts/cms-schema";
import {
  isPurchasable,
  money,
  priceCart,
  serializeOrderItems,
  shopConfig,
  toOrder,
  type CartLine,
  type CheckoutRequest,
  type CheckoutResponse,
  type Discount,
  type OrderLineItem,
  type OrderPaymentStatus,
  type PaymentMethod,
  type PriceBreakdown,
  type Product,
  type ProductAvailability,
  type ShippingMethod
} from "@three-acts/ecommerce";
import { ApiError } from "../http";
import { createSystemRecord, findRecords, updateSystemRecord } from "../cms/service";
import { findDiscount, getLiveProduct } from "./catalogue";
import { getPaymentProvider } from "./payments";

const paymentMethods: readonly PaymentMethod[] = ["card", "eft", "paypal", "apple_pay", "gift_card"];
const shippingMethods: readonly ShippingMethod[] = ["domestic", "international", "collection"];
const MAX_LINES = 50;

function fail(message: string): never {
  throw new ApiError(400, "validation_error", message);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Parses and validates an unknown request body into a `CheckoutRequest`,
 * normalizing whitespace/casing along the way (email lowercased, country and
 * discount code uppercased). Throws `ApiError(400, "validation_error", ...)`
 * on the first problem found — checkout is all-or-nothing, so there's no
 * value in collecting every error before failing.
 */
export function validateCheckout(body: unknown): CheckoutRequest {
  if (!body || typeof body !== "object") fail("Request body must be an object.");
  const input = body as Record<string, unknown>;

  const rawLines = input.lines;
  if (!Array.isArray(rawLines) || rawLines.length === 0) fail("At least one cart line is required.");
  if (rawLines.length > MAX_LINES) fail(`A checkout can contain at most ${MAX_LINES} lines.`);

  const seenSlugs = new Set<string>();
  const lines: CartLine[] = rawLines.map((raw, index) => {
    if (!raw || typeof raw !== "object") fail(`Line ${index + 1} is invalid.`);
    const line = raw as Record<string, unknown>;
    if (!isNonEmptyString(line.slug)) fail(`Line ${index + 1} is missing a product slug.`);
    const slug = line.slug.trim();
    if (seenSlugs.has(slug)) fail(`Duplicate line for "${slug}".`);
    seenSlugs.add(slug);
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      fail(`"${slug}" quantity must be a whole number between 1 and 99.`);
    }
    return { slug, quantity };
  });

  if (!input.customer || typeof input.customer !== "object") fail("customer is required.");
  const customerInput = input.customer as Record<string, unknown>;
  if (!isNonEmptyString(customerInput.name)) fail("customer.name is required.");
  if (!isNonEmptyString(customerInput.email) || !isValidEmail(customerInput.email.trim())) {
    fail("customer.email must be a valid email address.");
  }
  const customer: CheckoutRequest["customer"] = { name: customerInput.name.trim(), email: customerInput.email.trim().toLowerCase() };
  if (isNonEmptyString(customerInput.phone)) customer.phone = customerInput.phone.trim();

  if (!input.shipping || typeof input.shipping !== "object") fail("shipping is required.");
  const shippingInput = input.shipping as Record<string, unknown>;
  if (!isNonEmptyString(shippingInput.name)) fail("shipping.name is required.");
  if (!isNonEmptyString(shippingInput.address)) fail("shipping.address is required.");
  if (!isNonEmptyString(shippingInput.city)) fail("shipping.city is required.");
  if (!isNonEmptyString(shippingInput.postalCode)) fail("shipping.postalCode is required.");
  const country = isNonEmptyString(shippingInput.country) ? shippingInput.country.trim().toUpperCase() : "";
  if (!/^[A-Z]{2}$/.test(country)) fail("shipping.country must be a 2-letter ISO country code.");
  const methodRaw = shippingInput.method;
  if (typeof methodRaw !== "string" || !shippingMethods.includes(methodRaw as ShippingMethod)) {
    fail(`shipping.method must be one of ${shippingMethods.join(", ")}.`);
  }

  const shipping: CheckoutRequest["shipping"] = {
    name: shippingInput.name.trim(),
    address: shippingInput.address.trim(),
    city: shippingInput.city.trim(),
    postalCode: shippingInput.postalCode.trim(),
    country,
    method: methodRaw as ShippingMethod
  };

  const paymentMethodRaw = input.paymentMethod;
  if (typeof paymentMethodRaw !== "string" || !paymentMethods.includes(paymentMethodRaw as PaymentMethod)) {
    fail(`paymentMethod must be one of ${paymentMethods.join(", ")}.`);
  }

  const request: CheckoutRequest = {
    lines,
    customer,
    shipping,
    paymentMethod: paymentMethodRaw as PaymentMethod
  };

  if (isNonEmptyString(input.discountCode)) request.discountCode = input.discountCode.trim().toUpperCase();
  if (typeof input.marketingOptIn === "boolean") request.marketingOptIn = input.marketingOptIn;
  if (isNonEmptyString(input.notes)) request.notes = String(input.notes).trim();

  return request;
}

type ResolvedLine = { product: Product; quantity: number };

/** Loads every line's live product, rejecting unknown/unpurchasable slugs and quantities the stock can't cover (preorder lines skip the stock check). */
async function resolveLines(lines: CartLine[]): Promise<ResolvedLine[]> {
  const resolved: ResolvedLine[] = [];
  for (const line of lines) {
    const product = await getLiveProduct(line.slug);
    if (!product) fail(`"${line.slug}" is no longer available.`);
    if (!isPurchasable(product)) fail(`"${product.title}" is not available for purchase.`);
    if (product.availability !== "preorder" && line.quantity > product.inventory) {
      fail(`Only ${product.inventory} left of "${product.title}".`);
    }
    resolved.push({ product, quantity: line.quantity });
  }
  return resolved;
}

/** Every line must be priced in the same currency — mixed-currency carts can't be summed into one order total. */
function assertSingleCurrency(lines: ResolvedLine[]): string {
  const currencies = new Set(lines.map((line) => line.product.currency));
  if (currencies.size > 1) fail("All items in an order must use the same currency.");
  return lines[0]!.product.currency;
}

type ResolvedDiscount = { discount: Discount; record: CmsRecord };

async function resolveDiscount(code: string | undefined): Promise<ResolvedDiscount | undefined> {
  if (!code) return undefined;
  const result = await findDiscount(code);
  if ("reason" in result) fail(result.reason);
  return result;
}

/** Next order number: `prefix-(max existing numeric suffix + 1)`, falling back to `prefix-10001` when there are no existing orders yet. */
async function nextOrderNumber(): Promise<string> {
  const prefix = shopConfig.orderNumberPrefix;
  const existing = await findRecords("orders", () => true);
  let max = 10000;
  for (const record of existing) {
    const orderNumber = String(record.values.orderNumber ?? "");
    if (!orderNumber.startsWith(`${prefix}-`)) continue;
    const suffix = Number(orderNumber.slice(prefix.length + 1));
    if (Number.isFinite(suffix) && suffix > max) max = suffix;
  }
  return `${prefix}-${max + 1}`;
}

function buildOrderLineItems(lines: ResolvedLine[]): OrderLineItem[] {
  return lines.map(({ product, quantity }) => {
    const item: OrderLineItem = {
      slug: product.slug,
      sku: product.sku,
      title: product.title,
      quantity,
      unitPrice: product.price,
      lineTotal: money(product.price * quantity),
      currency: product.currency
    };
    const image = product.images[0]?.src;
    if (image) item.image = image;
    return item;
  });
}

/**
 * Decrements each purchased product's inventory and recomputes its
 * `availability` from the new count. Preorder lines are skipped entirely —
 * `resolveLines` never checked their inventory against quantity, so an
 * inventory count doesn't track a preorder's stock the same way.
 */
async function applyInventory(lines: ResolvedLine[]): Promise<void> {
  for (const { product, quantity } of lines) {
    if (product.availability === "preorder") continue;
    const inventory = Math.max(0, product.inventory - quantity);
    const availability: ProductAvailability = inventory === 0 ? "out_of_stock" : inventory <= shopConfig.lowStockThreshold ? "low_stock" : "in_stock";
    await updateSystemRecord("products", product.id, { inventory, availability }, { live: true });
  }
}

/** Creates the customer on first order, or updates their aggregates/blank contact fields on a repeat order. */
async function upsertCustomer(request: CheckoutRequest, breakdown: PriceBreakdown, paymentStatus: OrderPaymentStatus, placedAt: string): Promise<void> {
  const email = request.customer.email;
  const existing = (await findRecords("customers", (record) => String(record.values.email ?? "").trim().toLowerCase() === email))[0];

  if (!existing) {
    await createSystemRecord("customers", {
      name: request.customer.name,
      email,
      phone: request.customer.phone ?? "",
      address: request.shipping.address,
      city: request.shipping.city,
      postalCode: request.shipping.postalCode,
      country: request.shipping.country,
      marketingOptIn: request.marketingOptIn ?? false,
      totalOrders: 1,
      lifetimeValue: paymentStatus === "paid" ? breakdown.total : 0,
      firstOrderAt: placedAt,
      lastOrderAt: placedAt
    });
    return;
  }

  const patch: Partial<Record<string, CmsRecordValue>> = {
    totalOrders: Number(existing.values.totalOrders ?? 0) + 1,
    lastOrderAt: placedAt
  };
  if (paymentStatus === "paid") {
    patch.lifetimeValue = Number(existing.values.lifetimeValue ?? 0) + breakdown.total;
  }
  if (!String(existing.values.firstOrderAt ?? "").trim()) {
    patch.firstOrderAt = placedAt;
  }
  if (!String(existing.values.phone ?? "").trim() && request.customer.phone) patch.phone = request.customer.phone;
  if (!String(existing.values.address ?? "").trim() && request.shipping.address) patch.address = request.shipping.address;
  if (!String(existing.values.city ?? "").trim() && request.shipping.city) patch.city = request.shipping.city;
  if (!String(existing.values.postalCode ?? "").trim() && request.shipping.postalCode) patch.postalCode = request.shipping.postalCode;
  if (!String(existing.values.country ?? "").trim() && request.shipping.country) patch.country = request.shipping.country;

  await updateSystemRecord("customers", existing.id, patch);
}

async function incrementDiscountUsage(discount: ResolvedDiscount | undefined): Promise<void> {
  if (!discount) return;
  await updateSystemRecord("discount-codes", discount.record.id, { timesUsed: Number(discount.record.values.timesUsed ?? 0) + 1 });
}

/**
 * Runs the full checkout: resolve + price the cart, charge, create the order
 * (the site's system write path), then apply the order's side effects —
 * inventory, the customer record, discount usage — in that order. Each step
 * is its own function above so the sequence here reads as the checkout
 * contract. When `user` is signed in, `customer.email` is forced to the
 * session's email so an authenticated checkout can never place an order
 * under a different address than the account it gets attached to.
 */
export async function checkout(input: CheckoutRequest, user: AuthUser | null): Promise<CheckoutResponse> {
  const request: CheckoutRequest = user
    ? { ...input, customer: { ...input.customer, email: user.email.trim().toLowerCase() } }
    : input;

  const resolvedLines = await resolveLines(request.lines);
  const currency = assertSingleCurrency(resolvedLines);
  const discount = await resolveDiscount(request.discountCode);

  const breakdown = priceCart(resolvedLines, {
    discount: discount?.discount,
    shippingMethod: request.shipping.method,
    country: request.shipping.country
  });

  const orderNumber = await nextOrderNumber();
  const charge = await getPaymentProvider().charge({
    amount: breakdown.total,
    currency,
    method: request.paymentMethod,
    orderNumber,
    customerEmail: request.customer.email
  });

  const placedAt = new Date().toISOString();
  const items = buildOrderLineItems(resolvedLines);

  const record = await createSystemRecord("orders", {
    orderNumber,
    customerEmail: request.customer.email,
    customerName: request.customer.name,
    status: charge.paymentStatus === "paid" ? "paid" : "pending",
    paymentStatus: charge.paymentStatus,
    paymentMethod: request.paymentMethod,
    itemCount: breakdown.itemCount,
    items: serializeOrderItems(items),
    subtotal: breakdown.subtotal,
    discountTotal: breakdown.discountTotal,
    discountCode: discount?.discount.code ?? "",
    taxTotal: breakdown.taxTotal,
    shippingTotal: breakdown.shippingTotal,
    total: breakdown.total,
    currency,
    placedAt,
    shippingName: request.shipping.name,
    shippingAddress: request.shipping.address,
    shippingCity: request.shipping.city,
    shippingPostalCode: request.shipping.postalCode,
    shippingCountry: request.shipping.country,
    customerPhone: request.customer.phone ?? "",
    trackingNumber: "",
    notes: request.notes ?? ""
  });

  await applyInventory(resolvedLines);
  await upsertCustomer(request, breakdown, charge.paymentStatus, placedAt);
  await incrementDiscountUsage(discount);

  return { order: toOrder(record) };
}
