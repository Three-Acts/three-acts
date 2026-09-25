import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectionRegistry } from "../registry";
import { hasPublishWorkflow, isUniqueField } from "../columns";
import { parseFileValue, parseVideoValue } from "../files";
import { parseImageGallery, parseImageValue } from "../images";
import type { CmsCollection, CmsRecord, CmsRecordValue } from "../types";
import { productCategorySlugs, productSlugs } from "./keys";
import { shopSeed } from "./shop";
import { seedNow } from "./types";

const cents = (value: CmsRecordValue) => Math.round(Number(value) * 100);
const isEmpty = (value: CmsRecordValue) => value === null || value === undefined || (typeof value === "string" && value.trim() === "");

function collection(id: string): CmsCollection {
  const found = collectionRegistry.find((c) => c.id === id);
  assert.ok(found, `collection ${id} is registered`);
  return found;
}

function records(id: string): CmsRecord[] {
  const list = shopSeed[id];
  assert.ok(list && list.length > 0, `${id} has records`);
  return list;
}

/** Records whose required fields must be filled: live-bound editorial records and every data record. */
function mustBeComplete(c: CmsCollection, record: CmsRecord): boolean {
  return !hasPublishWorkflow(c) || record.publishStatus === "published" || record.publishStatus === "queued_to_publish";
}

function checkValues(c: CmsCollection, record: CmsRecord, values: Record<string, CmsRecordValue>, enforceRequired: boolean) {
  const label = `${c.id}/${record.id}`;
  const fields = new Map(c.fields.map((f) => [f.key, f]));
  for (const key of Object.keys(values)) {
    assert.ok(fields.has(key), `${label}: "${key}" is a real field`);
  }
  for (const field of c.fields) {
    const value = values[field.key];
    if (enforceRequired && field.required) {
      assert.ok(!isEmpty(value), `${label}: required ${field.key} is filled`);
    }
    if (isEmpty(value)) continue;
    switch (field.type) {
      case "select":
        assert.ok(field.options.some((o) => o.value === value), `${label}: ${field.key}="${String(value)}" is a valid option`);
        break;
      case "number":
        assert.equal(typeof value, "number", `${label}: ${field.key} is a number`);
        assert.ok(Number.isFinite(value), `${label}: ${field.key} is finite`);
        break;
      case "boolean":
        assert.equal(typeof value, "boolean", `${label}: ${field.key} is a boolean`);
        break;
      case "datetime":
        assert.ok(typeof value === "string" && new Date(value).toISOString() === value, `${label}: ${field.key} is ISO UTC`);
        break;
      case "image":
        assert.ok(parseImageValue(value), `${label}: ${field.key} parses as an image`);
        assert.ok(typeof value === "string" && value.startsWith("{"), `${label}: ${field.key} is canonical JSON`);
        break;
      case "image-gallery": {
        const items = parseImageGallery(value);
        assert.equal(JSON.stringify(items), value, `${label}: ${field.key} is a canonical gallery`);
        if (enforceRequired && field.minItems !== undefined) assert.ok(items.length >= field.minItems, `${label}: ${field.key} has ≥${field.minItems} images`);
        if (field.maxItems !== undefined) assert.ok(items.length <= field.maxItems, `${label}: ${field.key} has ≤${field.maxItems} images`);
        break;
      }
      case "video":
        assert.ok(parseVideoValue(value)?.contentType?.startsWith("video/"), `${label}: ${field.key} parses as a video`);
        break;
      case "file":
        assert.ok(parseFileValue(value)?.contentType, `${label}: ${field.key} parses as a file`);
        break;
      default:
        assert.equal(typeof value, "string", `${label}: ${field.key} is text`);
    }
  }
}

describe("shop seed — schema conformance", () => {
  const ids = ["product-categories", "products", "testimonials", "customers", "orders", "product-reviews", "discount-codes"];

  it("seeds exactly the shop collections", () => {
    assert.deepEqual(Object.keys(shopSeed).sort(), [...ids].sort());
  });

  for (const id of ids) {
    it(`${id}: values, liveValues and record metadata follow the registry`, () => {
      const c = collection(id);
      const recordIds = new Set<string>();
      for (const record of records(id)) {
        assert.ok(!recordIds.has(record.id), `${id}: record id ${record.id} is unique`);
        recordIds.add(record.id);
        assert.ok(record.createdAt <= record.modifiedAt, `${id}/${record.id}: createdAt ≤ modifiedAt`);
        assert.ok(record.modifiedAt <= seedNow.toISOString(), `${id}/${record.id}: modifiedAt is not in the future`);
        checkValues(c, record, record.values, mustBeComplete(c, record));

        if (!hasPublishWorkflow(c)) {
          assert.equal(record.publishStatus, "not_published", `${id}/${record.id}: data records use the not_published status (what the API assigns on create)`);
          assert.equal(record.liveValues, null, `${id}/${record.id}: data records have no live snapshot`);
        } else if (record.publishStatus === "published") {
          assert.deepEqual(record.liveValues, record.values, `${id}/${record.id}: published live snapshot equals values`);
        } else if (record.publishStatus === "not_published") {
          assert.equal(record.liveValues, null, `${id}/${record.id}: not_published has no snapshot`);
        } else if (record.liveValues) {
          assert.notDeepEqual(record.liveValues, record.values, `${id}/${record.id}: a draft snapshot differs from the working values`);
          checkValues(c, record, record.liveValues, true);
        }
      }
    });

    it(`${id}: unique fields are unique`, () => {
      const c = collection(id);
      for (const field of c.fields.filter(isUniqueField)) {
        const seen = new Set<string>();
        for (const record of records(id)) {
          const value = record.values[field.key];
          if (isEmpty(value)) continue;
          const key = String(value).toLowerCase();
          assert.ok(!seen.has(key), `${id}: ${field.key} "${String(value)}" is unique`);
          seen.add(key);
        }
      }
    });
  }
});

describe("shop seed — references", () => {
  const productBySlug = new Map(records("products").map((r) => [String(r.values.slug), r]));
  const customerByEmail = new Map(records("customers").map((r) => [String(r.values.email), r]));

  it("product categories are exactly the shared keys", () => {
    assert.deepEqual(records("product-categories").map((r) => r.values.slug), [...productCategorySlugs]);
  });

  it("every shared product slug exists and is on the live site", () => {
    for (const slug of productSlugs) {
      const record = productBySlug.get(slug);
      assert.ok(record, `product ${slug} exists`);
      assert.ok(record.liveValues, `product ${slug} has a live snapshot`);
    }
    assert.ok(productBySlug.size >= 55, "catalogue has ~60 products");
  });

  it("products reference real categories and respect stock rules", () => {
    for (const r of records("products")) {
      assert.ok((productCategorySlugs as readonly string[]).includes(String(r.values.category)), `${r.id}: category exists`);
      if (r.values.availability === "out_of_stock") assert.equal(r.values.inventory, 0, `${r.id}: out of stock ⇒ inventory 0`);
      const compare = Number(r.values.compareAtPrice);
      if (compare > 0) assert.ok(compare > Number(r.values.price), `${r.id}: compare-at price is above price`);
    }
  });

  it("testimonials reference shared product slugs", () => {
    for (const r of records("testimonials")) {
      if (r.values.product) assert.ok((productSlugs as readonly string[]).includes(String(r.values.product)), `${r.id}: product is a shared key`);
    }
  });

  it("orders reference customers; reviews reference products and verified customers", () => {
    for (const r of records("orders")) {
      const customer = customerByEmail.get(String(r.values.customerEmail));
      assert.ok(customer, `${r.id}: customer exists`);
      assert.equal(r.values.customerName, customer.values.name);
    }
    for (const r of records("product-reviews")) {
      assert.ok(productBySlug.has(String(r.values.product)), `${r.id}: product exists`);
      if (r.values.verifiedPurchase) {
        const customer = customerByEmail.get(String(r.values.customerEmail));
        assert.ok(customer, `${r.id}: verified reviewer is a customer`);
        assert.ok(String(r.values.submittedAt) > String(customer.values.firstOrderAt), `${r.id}: submitted after the first order`);
      }
    }
  });
});

describe("shop seed — orders, customers and discounts agree", () => {
  const orders = records("orders");
  const codes = new Map(records("discount-codes").map((r) => [String(r.values.code), r]));

  it("order money adds up to the cent", () => {
    for (const r of orders) {
      const v = r.values;
      const subtotal = cents(v.subtotal);
      const discount = cents(v.discountTotal);
      const tax = cents(v.taxTotal);
      const shipping = cents(v.shippingTotal);
      assert.equal(cents(v.total), subtotal - discount + tax + shipping, `${r.id}: total`);
      assert.ok(discount >= 0 && discount <= subtotal, `${r.id}: discount within subtotal`);
      if (v.shippingCountry === "ZA") {
        assert.equal(tax, Math.round((subtotal - discount) * 0.15), `${r.id}: 15% VAT`);
        if (subtotal - discount + tax >= 60_000) assert.equal(shipping, 0, `${r.id}: free shipping over R600`);
        else assert.ok(shipping === 0 || shipping === 9_500, `${r.id}: R95 shipping (or free via code/collection)`);
      } else {
        assert.equal(tax, 0, `${r.id}: exports are zero-rated`);
      }
      assert.ok(Number(v.itemCount) >= 1, `${r.id}: has items`);
      assert.equal(v.currency, "ZAR");
    }
    assert.ok(orders.some((r) => r.values.total === 0), "a 100%-off order exists");
  });

  it("status combinations make sense", () => {
    for (const r of orders) {
      const { status, paymentStatus, trackingNumber } = r.values;
      if (status === "refunded") assert.equal(paymentStatus, "refunded", `${r.id}: refunded ⇒ payment refunded`);
      if (paymentStatus === "refunded") assert.equal(status, "refunded", `${r.id}`);
      if (status === "pending") assert.ok(paymentStatus === "awaiting" || paymentStatus === "authorized", `${r.id}: pending ⇒ unpaid`);
      if (status === "paid" || status === "fulfilled" || status === "shipped") assert.equal(paymentStatus, "paid", `${r.id}: ${String(status)} ⇒ paid`);
      if (status === "cancelled") assert.ok(paymentStatus === "failed" || paymentStatus === "awaiting", `${r.id}: cancelled never captured`);
      if (status === "shipped") assert.ok(!isEmpty(trackingNumber), `${r.id}: shipped has tracking`);
    }
  });

  it("order numbers are unique and increase with placedAt", () => {
    const sorted = [...orders].sort((a, b) => String(a.values.placedAt).localeCompare(String(b.values.placedAt)));
    let previous = 0;
    for (const r of sorted) {
      const match = /^FF-(\d+)$/.exec(String(r.values.orderNumber));
      assert.ok(match, `${r.id}: order number format`);
      assert.equal(r.id, `order-${String(r.values.orderNumber)}`);
      const n = Number(match[1]);
      assert.ok(n > previous, `${r.id}: increasing`);
      previous = n;
      assert.ok(String(r.values.placedAt) <= seedNow.toISOString(), `${r.id}: placed in the past`);
    }
  });

  it("customer aggregates are computed from their orders", () => {
    for (const c of records("customers")) {
      const own = orders.filter((o) => o.values.customerEmail === c.values.email);
      const placed = own.map((o) => String(o.values.placedAt)).sort();
      assert.equal(c.values.totalOrders, own.length, `${c.id}: totalOrders`);
      assert.equal(
        cents(c.values.lifetimeValue),
        own.filter((o) => o.values.paymentStatus === "paid").reduce((sum, o) => sum + cents(o.values.total), 0),
        `${c.id}: lifetimeValue = paid order totals`
      );
      assert.equal(c.values.firstOrderAt, placed[0] ?? "", `${c.id}: firstOrderAt`);
      assert.equal(c.values.lastOrderAt, placed[placed.length - 1] ?? "", `${c.id}: lastOrderAt`);
      if (placed[0]) assert.ok(c.createdAt <= placed[0], `${c.id}: account created before first order`);
    }
    assert.ok(records("customers").some((c) => c.values.phone === ""), "a customer without a phone exists");
  });

  it("discount timesUsed matches the orders that used each code", () => {
    for (const [code, r] of codes) {
      const used = orders.filter((o) => o.values.discountCode === code);
      assert.equal(r.values.timesUsed, used.length, `${code}: timesUsed`);
      const limit = Number(r.values.usageLimit);
      if (limit > 0) assert.ok(used.length <= limit, `${code}: within usage limit`);
      for (const o of used) {
        assert.ok(String(o.values.placedAt) >= String(r.values.startsAt), `${o.id}: ${code} had started`);
        if (r.values.endsAt) assert.ok(String(o.values.placedAt) <= String(r.values.endsAt), `${o.id}: ${code} had not expired`);
      }
    }
    for (const o of orders) {
      if (o.values.discountCode) assert.ok(codes.has(String(o.values.discountCode)), `${o.id}: discount code exists`);
    }
    const values = [...codes.values()].map((r) => r.values);
    assert.ok(values.some((v) => Number(v.usageLimit) > 0 && v.timesUsed === v.usageLimit), "an exhausted code exists");
    assert.ok(values.some((v) => v.active === false), "an inactive code exists");
    assert.ok(values.some((v) => v.endsAt && String(v.endsAt) < seedNow.toISOString()), "an expired code exists");
    assert.ok(values.some((v) => v.discountType === "free_shipping"), "a free-shipping code exists");
  });
});
