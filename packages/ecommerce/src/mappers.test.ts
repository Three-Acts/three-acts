import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedCollections } from "@three-acts/cms-schema/seed";
import { parseOrderItems, serializeOrderItems, toCustomer, toOrder, toProduct, toProductCategory, toProductReview } from "./mappers";
import type { OrderLineItem } from "./models";

describe("toProduct", () => {
  it("maps every seed product record without throwing, with well-typed fields", () => {
    for (const record of seedCollections.products) {
      const product = toProduct(record);
      assert.equal(product.id, record.id);
      assert.ok(product.slug.length > 0, "slug is non-empty");
      assert.ok(product.sku.length > 0, "sku is non-empty");
      assert.equal(typeof product.price, "number");
      assert.ok(["in_stock", "low_stock", "out_of_stock", "preorder", "discontinued"].includes(product.availability));
      assert.ok(Array.isArray(product.images));
      for (const image of product.images) {
        assert.equal(typeof image.src, "string");
        assert.equal(typeof image.alt, "string");
      }
      assert.ok(Array.isArray(product.tags));
    }
  });

  it("drops a zero/empty compare-at price rather than reporting a fake sale", () => {
    const record = seedCollections.products.find((r) => Number(r.values.compareAtPrice) === 0);
    assert.ok(record, "fixture: a product with no compare-at price");
    const product = toProduct(record!);
    assert.equal(product.compareAtPrice, undefined);
  });

  it("keeps a real compare-at price", () => {
    const record = seedCollections.products.find((r) => Number(r.values.compareAtPrice) > 0);
    assert.ok(record, "fixture: a product on sale");
    const product = toProduct(record!);
    assert.equal(product.compareAtPrice, Number(record!.values.compareAtPrice));
  });

  it("splits comma-separated tags and trims whitespace", () => {
    const record = seedCollections.products.find((r) => typeof r.values.tags === "string" && r.values.tags.includes(","));
    assert.ok(record, "fixture: a product with more than one tag");
    const product = toProduct(record!);
    assert.ok(product.tags.length >= 2);
    assert.ok(product.tags.every((tag) => tag === tag.trim() && tag.length > 0));
  });

  it("maps categorySlug from the registry's 'category' field key", () => {
    const record = seedCollections.products[0];
    const product = toProduct(record);
    assert.equal(product.categorySlug, record.values.category);
  });
});

describe("toProductCategory", () => {
  it("maps every seed product-category record", () => {
    for (const record of seedCollections["product-categories"]) {
      const category = toProductCategory(record);
      assert.equal(category.id, record.id);
      assert.ok(category.slug.length > 0);
      assert.ok(category.name.length > 0);
      assert.equal(typeof category.sortOrder, "number");
    }
  });
});

describe("toProductReview", () => {
  it("maps every seed review record, with rating parsed to a number", () => {
    for (const record of seedCollections["product-reviews"]) {
      const review = toProductReview(record);
      assert.equal(review.id, record.id);
      assert.equal(review.productSlug, record.values.product);
      assert.ok(review.rating >= 1 && review.rating <= 5, `rating ${review.rating} in range`);
      assert.equal(typeof review.verifiedPurchase, "boolean");
    }
  });
});

describe("toOrder", () => {
  it("maps a seed order record's totals and line items", () => {
    const record = seedCollections.orders[0];
    const order = toOrder(record);
    assert.equal(order.id, record.id);
    assert.equal(order.orderNumber, record.values.orderNumber);
    assert.equal(order.customerEmail, record.values.customerEmail);
    assert.equal(order.subtotal, record.values.subtotal);
    assert.equal(order.taxTotal, record.values.taxTotal);
    assert.equal(order.shippingTotal, record.values.shippingTotal);
    assert.equal(order.total, record.values.total);
    assert.equal(order.freeShipping, Number(record.values.shippingTotal) === 0);
    assert.deepEqual(order.items, parseOrderItems(record.values.items));
  });

  it("derives merchandiseInclVat from the line items when present", () => {
    const withItems = seedCollections.orders.find((r) => typeof r.values.items === "string" && r.values.items !== "[]" && r.values.items !== "");
    assert.ok(withItems, "fixture: an order with line items");
    const order = toOrder(withItems!);
    const expected = Math.round(order.items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
    assert.equal(order.merchandiseInclVat, expected);
  });

  it("reads every order status/paymentStatus/paymentMethod as a known value", () => {
    for (const record of seedCollections.orders) {
      const order = toOrder(record);
      assert.ok(["pending", "paid", "fulfilled", "shipped", "refunded", "cancelled"].includes(order.status));
      assert.ok(["awaiting", "authorized", "paid", "partially_refunded", "refunded", "failed"].includes(order.paymentStatus));
      assert.ok(["card", "eft", "paypal", "apple_pay", "gift_card"].includes(order.paymentMethod));
    }
  });
});

describe("toCustomer", () => {
  it("maps a seed customer record", () => {
    const record = seedCollections.customers[0];
    const customer = toCustomer(record);
    assert.equal(customer.id, record.id);
    assert.equal(customer.email, record.values.email);
    assert.equal(customer.totalOrders, record.values.totalOrders);
    assert.equal(customer.lifetimeValue, record.values.lifetimeValue);
    assert.equal(typeof customer.address, "string");
    assert.equal(typeof customer.postalCode, "string");
  });

  it("omits firstOrderAt/lastOrderAt for a customer who has never ordered", () => {
    const record = seedCollections.customers.find((r) => r.values.firstOrderAt === "");
    assert.ok(record, "fixture: a customer with no orders");
    const customer = toCustomer(record!);
    assert.equal(customer.firstOrderAt, undefined);
    assert.equal(customer.lastOrderAt, undefined);
  });
});

describe("parseOrderItems / serializeOrderItems", () => {
  const items: OrderLineItem[] = [
    { slug: "house-blend-350g", sku: "FF-BAG-350", title: "House Blend 350g", quantity: 2, unitPrice: 350, lineTotal: 700, currency: "ZAR" },
    { slug: "aeropress-go", sku: "FF-GEAR-AGO", title: "AeroPress Go", quantity: 1, unitPrice: 620, lineTotal: 620, currency: "ZAR", image: "https://cdn.example.com/aeropress.jpg" }
  ];

  it("round-trips a list of line items through serialize -> parse", () => {
    assert.deepEqual(parseOrderItems(serializeOrderItems(items)), items);
  });

  it("returns [] for empty string, invalid JSON, non-array JSON, undefined and null", () => {
    assert.deepEqual(parseOrderItems(""), []);
    assert.deepEqual(parseOrderItems("   "), []);
    assert.deepEqual(parseOrderItems("not json"), []);
    assert.deepEqual(parseOrderItems(JSON.stringify({ not: "an array" })), []);
    assert.deepEqual(parseOrderItems(undefined), []);
    assert.deepEqual(parseOrderItems(null), []);
  });

  it("drops malformed entries but keeps well-formed ones in the same array", () => {
    const raw = JSON.stringify([
      { slug: "good", title: "Good Item", quantity: 1, unitPrice: 100, lineTotal: 100, currency: "ZAR" },
      { slug: "missing-quantity", title: "Bad Item" },
      "not-an-object",
      null
    ]);
    const parsed = parseOrderItems(raw);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].slug, "good");
  });

  it("parses every seed order's items field without throwing", () => {
    for (const record of seedCollections.orders) {
      const parsed = parseOrderItems(record.values.items);
      assert.ok(Array.isArray(parsed));
    }
  });
});
