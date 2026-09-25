import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { cloneSeedCollections } from "@three-acts/cms-schema/seed";
import { parseOrderItems, priceCart } from "@three-acts/ecommerce";
import { ApiError } from "../_lib/http";
import { MemoryDataStore } from "../_lib/cms/memory-store";
import { setDataStoreForTests } from "../_lib/cms/resolve-store";
import { findRecords } from "../_lib/cms/service";
import { findDiscount, listApprovedReviews, listLiveProducts, submitReview } from "../_lib/shop/catalogue";
import { checkout, validateCheckout } from "../_lib/shop/checkout";
import { getOrderForEmail, listOrdersForEmail } from "../_lib/shop/orders";

/** Fresh, isolated store per test — a clone of the shared "Fynbos & Fire" seed so every test sees the same realistic catalogue/orders/customers without leaking mutations between tests. */
function freshStore(t: TestContext): void {
  setDataStoreForTests(new MemoryDataStore(async () => cloneSeedCollections()));
  t.after(() => setDataStoreForTests(undefined));
}

async function maxExistingOrderNumber(): Promise<number> {
  const orders = await findRecords("orders", () => true);
  return orders.reduce((max, record) => {
    const n = Number(String(record.values.orderNumber ?? "").replace(/^FF-/, ""));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
}

async function purchasableProduct(minInventory = 1) {
  const products = await listLiveProducts();
  const product = products.find((p) => (p.availability === "in_stock" || p.availability === "low_stock") && p.inventory > minInventory);
  assert.ok(product, "expected at least one in-stock/low-stock product with spare inventory in the seed");
  return product!;
}

test("checkout: happy path matches priceCart, decrements inventory, updates the customer, increments discount usage, and picks the next order number", async (t) => {
  freshStore(t);

  const product = await purchasableProduct(3);
  const maxBefore = await maxExistingOrderNumber();

  const discountLookup = await findDiscount("welcome10");
  assert.ok("discount" in discountLookup, "expected WELCOME10 to be a currently-redeemable seeded code");
  if (!("discount" in discountLookup)) return;
  const timesUsedBefore = Number(discountLookup.record.values.timesUsed ?? 0);

  const request = validateCheckout({
    lines: [{ slug: product.slug, quantity: 2 }],
    customer: { name: "Nomvula Test", email: "nomvula.test@example.com" },
    shipping: { name: "Nomvula Test", address: "12 Long St", city: "Cape Town", postalCode: "8001", country: "za", method: "domestic" },
    discountCode: "welcome10",
    paymentMethod: "card"
  });

  const { order } = await checkout(request, null);

  const expected = priceCart([{ product, quantity: 2 }], {
    discount: discountLookup.discount,
    shippingMethod: "domestic",
    country: "ZA"
  });

  assert.equal(order.subtotal, expected.subtotal);
  assert.equal(order.discountTotal, expected.discountTotal);
  assert.equal(order.taxTotal, expected.taxTotal);
  assert.equal(order.shippingTotal, expected.shippingTotal);
  assert.equal(order.total, expected.total);
  assert.equal(order.itemCount, 2);
  assert.equal(order.paymentStatus, "paid");
  assert.equal(order.status, "paid");
  assert.equal(order.orderNumber, `FF-${maxBefore + 1}`);
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0]?.slug, product.slug);

  // "products" is an editorial-mode collection with a publish workflow:
  // `updateSystemRecord` writes the new inventory to the record's stored
  // `values` immediately, but flips it to "draft" and leaves the *live*
  // snapshot (what `listLiveProducts`/`getLiveProduct` serve) at its old
  // value until the record is republished. So the decrement is verified
  // against the stored record here, not the live-published view.
  const updatedRecord = (await findRecords("products", (r) => r.values.slug === product.slug))[0];
  assert.equal(updatedRecord?.values.inventory, product.inventory - 2);

  const customerRecords = await findRecords("customers", (r) => r.values.email === "nomvula.test@example.com");
  assert.equal(customerRecords.length, 1);
  assert.equal(customerRecords[0]?.values.totalOrders, 1);
  assert.equal(customerRecords[0]?.values.lifetimeValue, order.total);

  const discountAfter = await findRecords("discount-codes", (r) => r.id === discountLookup.record.id);
  assert.equal(discountAfter[0]?.values.timesUsed, timesUsedBefore + 1);
});

test("checkout: rejects a line quantity above inventory", async (t) => {
  freshStore(t);
  const products = await listLiveProducts();
  // Needs inventory under 99 so `inventory + 1` still passes the 1..99
  // quantity-range check in validateCheckout and only the stock check fails.
  const product = products.find((p) => (p.availability === "in_stock" || p.availability === "low_stock") && p.inventory > 0 && p.inventory < 99);
  assert.ok(product, "expected a purchasable product with inventory under 99 in the seed");

  const request = validateCheckout({
    lines: [{ slug: product!.slug, quantity: product!.inventory + 1 }],
    customer: { name: "Over Order", email: "over.order@example.com" },
    shipping: { name: "Over Order", address: "1 Main Rd", city: "Cape Town", postalCode: "8001", country: "ZA", method: "domestic" },
    paymentMethod: "card"
  });

  await assert.rejects(
    () => checkout(request, null),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      assert.equal(error.code, "validation_error");
      assert.match(error.message, /left/i);
      return true;
    }
  );
});

test("findDiscount: reports a reason for an unknown code instead of throwing", async (t) => {
  freshStore(t);
  const result = await findDiscount("NOT-A-REAL-CODE");
  assert.ok("reason" in result);
  if ("reason" in result) {
    assert.equal(result.reason, "That discount code doesn't exist.");
  }
});

test("submitReview: stores an unapproved, unverified review by default, and listApprovedReviews excludes it", async (t) => {
  freshStore(t);
  const product = await purchasableProduct(0);

  const before = await listApprovedReviews(product.slug);

  const review = await submitReview(product.slug, {
    title: "Solid everyday coffee",
    customerName: "Anonymous Shopper",
    customerEmail: "never-bought-anything@example.com",
    rating: 4,
    body: "Good balance, would buy again."
  });

  assert.equal(review.verifiedPurchase, false);

  const record = (await findRecords("product-reviews", (r) => r.id === review.id))[0];
  assert.equal(record?.values.approved, false);
  assert.equal(record?.values.source, "site");

  const after = await listApprovedReviews(product.slug);
  assert.equal(after.length, before.length, "an unapproved review must not appear in listApprovedReviews");
});

test("submitReview: verifiedPurchase is true for a seeded customer with a paid order containing the product", async (t) => {
  freshStore(t);

  const paidOrders = await findRecords("orders", (r) => r.values.paymentStatus === "paid");
  let buyerEmail: string | undefined;
  let boughtSlug: string | undefined;
  for (const order of paidOrders) {
    const items = parseOrderItems(order.values.items);
    if (items[0]) {
      buyerEmail = String(order.values.customerEmail ?? "");
      boughtSlug = items[0].slug;
      break;
    }
  }
  assert.ok(buyerEmail && boughtSlug, "expected at least one seeded paid order with line items");

  const review = await submitReview(boughtSlug!, {
    title: "Exactly what I expected",
    customerName: "Verified Buyer",
    customerEmail: buyerEmail,
    rating: 5,
    body: "Ordered before, ordering again."
  });

  assert.equal(review.verifiedPurchase, true);
});

test("orders: listOrdersForEmail and getOrderForEmail are scoped to the customer's own email", async (t) => {
  freshStore(t);
  const product = await purchasableProduct(1);

  const request = validateCheckout({
    lines: [{ slug: product.slug, quantity: 1 }],
    customer: { name: "Owner Of Order", email: "owner@example.com" },
    shipping: { name: "Owner Of Order", address: "5 Kloof St", city: "Cape Town", postalCode: "8001", country: "ZA", method: "collection" },
    paymentMethod: "eft"
  });
  const { order } = await checkout(request, null);

  const ownOrders = await listOrdersForEmail("owner@example.com");
  assert.ok(ownOrders.some((o) => o.orderNumber === order.orderNumber));

  const strangerOrders = await listOrdersForEmail("someone-else@example.com");
  assert.ok(!strangerOrders.some((o) => o.orderNumber === order.orderNumber));

  const ownFetch = await getOrderForEmail(order.orderNumber, "owner@example.com");
  assert.equal(ownFetch?.orderNumber, order.orderNumber);

  const strangerFetch = await getOrderForEmail(order.orderNumber, "someone-else@example.com");
  assert.equal(strangerFetch, null);
});
