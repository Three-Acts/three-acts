import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shopConfig } from "./config";
import type { Discount, Product } from "./models";
import { applyDiscount, availabilityLabel, formatMoney, isPurchasable, priceCart, shippingFor } from "./pricing";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-house-blend",
    slug: "house-blend-350g",
    sku: "FF-BAG-350",
    title: "House Blend 350g",
    categorySlug: "coffee",
    price: 350,
    currency: "ZAR",
    inventory: 40,
    availability: "in_stock",
    shortDescription: "",
    description: "",
    images: [],
    weightGrams: 350,
    tags: [],
    featured: false,
    ...overrides
  };
}

describe("priceCart", () => {
  it("prices a R350 bag, qty 2, domestic — the worked example", () => {
    const breakdown = priceCart([{ product: product(), quantity: 2 }], { shippingMethod: "domestic", country: "ZA" });
    assert.equal(breakdown.itemCount, 2);
    assert.equal(breakdown.merchandiseInclVat, 700);
    assert.equal(breakdown.subtotal, 608.7);
    assert.equal(breakdown.taxTotal, 91.3);
    assert.equal(breakdown.shippingTotal, 0);
    assert.equal(breakdown.freeShipping, true);
    assert.equal(breakdown.discountTotal, 0);
    assert.equal(breakdown.total, 700);
    assert.equal(breakdown.currency, "ZAR");
  });

  it("zero-rates VAT and charges flat shipping for an international order under the free-shipping threshold", () => {
    const breakdown = priceCart([{ product: product({ price: 180 }), quantity: 1 }], { shippingMethod: "international", country: "GB" });
    const expectedSubtotal = Math.round((180 / 1.15) * 100) / 100;
    assert.equal(breakdown.taxTotal, 0);
    assert.equal(breakdown.shippingTotal, 450);
    assert.equal(breakdown.freeShipping, false);
    assert.equal(breakdown.subtotal, expectedSubtotal);
    assert.equal(breakdown.total, Math.round((expectedSubtotal + 450) * 100) / 100);
  });

  it("applies a percentage discount to the ex-VAT subtotal", () => {
    const discount: Discount = { code: "WELCOME10", kind: "percentage", amount: 10, minimumSubtotal: 0 };
    const breakdown = priceCart([{ product: product({ price: 230 }), quantity: 1 }], { discount, shippingMethod: "domestic", country: "ZA" });
    const rawSubtotal = 230 / 1.15;
    const expectedDiscount = Math.round(rawSubtotal * 0.1 * 100) / 100;
    assert.equal(breakdown.discountTotal, expectedDiscount);
    assert.ok(breakdown.discountTotal > 0);
    assert.equal(breakdown.total, Math.round((breakdown.subtotal - breakdown.discountTotal + breakdown.taxTotal + breakdown.shippingTotal) * 100) / 100);
  });

  it("caps a fixed-amount discount at the subtotal (never goes negative)", () => {
    const discount: Discount = { code: "BIGFIXED", kind: "fixed_amount", amount: 100_000, minimumSubtotal: 0 };
    const breakdown = priceCart([{ product: product({ price: 100 }), quantity: 1 }], { discount, shippingMethod: "domestic", country: "ZA" });
    assert.equal(breakdown.discountTotal, breakdown.subtotal);
    assert.equal(breakdown.taxTotal, 0);
  });

  it("zeroes shipping for a free_shipping discount without discounting merchandise", () => {
    const discount: Discount = { code: "FREESHIP", kind: "free_shipping", amount: 0, minimumSubtotal: 0 };
    const breakdown = priceCart([{ product: product({ price: 120 }), quantity: 1 }], { discount, shippingMethod: "domestic", country: "ZA" });
    assert.equal(breakdown.discountTotal, 0);
    assert.equal(breakdown.shippingTotal, 0);
    assert.equal(breakdown.freeShipping, true);
    assert.ok(breakdown.taxTotal > 0);
  });

  it("gates a discount on minimumSubtotal", () => {
    const discount: Discount = { code: "BIGSPEND", kind: "percentage", amount: 20, minimumSubtotal: 1000 };
    const belowThreshold = priceCart([{ product: product({ price: 100 }), quantity: 1 }], { discount, shippingMethod: "domestic", country: "ZA" });
    assert.equal(belowThreshold.discountTotal, 0);

    const aboveThreshold = priceCart([{ product: product({ price: 1200 }), quantity: 1 }], { discount, shippingMethod: "domestic", country: "ZA" });
    assert.ok(aboveThreshold.discountTotal > 0);
  });

  it("is always free for roastery collection", () => {
    const breakdown = priceCart([{ product: product({ price: 50 }), quantity: 1 }], { shippingMethod: "collection", country: "ZA" });
    assert.equal(breakdown.shippingTotal, 0);
    assert.equal(breakdown.freeShipping, true);
  });
});

describe("shippingFor", () => {
  it("charges the domestic rate under the free threshold", () => {
    assert.equal(
      shippingFor({ shippingMethod: "domestic", discountedMerchandiseInclVat: 100, freeShippingDiscount: false }),
      shopConfig.shipping.domestic
    );
  });

  it("is free at or above the threshold", () => {
    assert.equal(
      shippingFor({ shippingMethod: "domestic", discountedMerchandiseInclVat: shopConfig.shipping.freeOverInclVat, freeShippingDiscount: false }),
      0
    );
  });
});

describe("applyDiscount", () => {
  it("returns 0 when there is no discount", () => {
    assert.equal(applyDiscount(500, undefined), 0);
  });
});

describe("formatMoney", () => {
  it("formats ZAR at en-ZA with the currency symbol, grouped thousands and a comma decimal", () => {
    const formatted = formatMoney(1234, "ZAR", "en-ZA");
    assert.match(formatted, /^R\s*1\s*234,00$/u);
  });

  it("defaults the locale to en-ZA", () => {
    assert.equal(formatMoney(10, "ZAR"), formatMoney(10, "ZAR", "en-ZA"));
  });
});

describe("availabilityLabel / isPurchasable", () => {
  it("treats in_stock with healthy inventory as purchasable and 'In stock'", () => {
    const p = product({ availability: "in_stock", inventory: 40 });
    assert.equal(isPurchasable(p), true);
    assert.equal(availabilityLabel(p), "In stock");
  });

  it("folds in_stock at/under the low-stock threshold into 'Low stock'", () => {
    const p = product({ availability: "in_stock", inventory: shopConfig.lowStockThreshold });
    assert.equal(availabilityLabel(p), "Low stock");
  });

  it("treats in_stock with zero inventory as not purchasable", () => {
    assert.equal(isPurchasable(product({ availability: "in_stock", inventory: 0 })), false);
  });

  it("treats out_of_stock and discontinued as not purchasable", () => {
    assert.equal(isPurchasable(product({ availability: "out_of_stock", inventory: 5 })), false);
    assert.equal(isPurchasable(product({ availability: "discontinued", inventory: 5 })), false);
  });

  it("treats preorder as purchasable regardless of inventory", () => {
    assert.equal(isPurchasable(product({ availability: "preorder", inventory: 0 })), true);
  });
});
