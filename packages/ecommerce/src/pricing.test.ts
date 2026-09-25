import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shopConfig } from "./config";
import type { Discount, Product } from "./models";
import { applyDiscount, availabilityLabel, formatMoney, isPurchasable, priceCart, shippingFor } from "./pricing";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-web-app",
    slug: "web-app",
    sku: "TA-APP-WEB",
    title: "Web App (Astro Static Site)",
    categorySlug: "apps",
    price: 149,
    currency: "USD",
    inventory: 999,
    availability: "in_stock",
    shortDescription: "",
    description: "",
    images: [],
    weightGrams: 0,
    tags: [],
    featured: false,
    ...overrides
  };
}

// `shopConfig` (see `config.ts`) charges no VAT and no shipping at all — every
// product here is a digital download. That collapses `taxTotal` and
// `shippingTotal` to 0 on every cart, so the interesting coverage below is
// the discount math (percentage / fixed-amount / free-shipping /
// minimumSubtotal gating) and proving the tax/shipping identities hold
// explicitly rather than by accident.

describe("priceCart", () => {
  it("prices a $149 product, qty 2, domestic — the worked example", () => {
    const breakdown = priceCart([{ product: product(), quantity: 2 }], { shippingMethod: "domestic", country: "US" });
    assert.equal(breakdown.itemCount, 2);
    assert.equal(breakdown.merchandiseInclVat, 298);
    assert.equal(breakdown.subtotal, 298);
    assert.equal(breakdown.taxTotal, 0);
    assert.equal(breakdown.shippingTotal, 0);
    assert.equal(breakdown.freeShipping, true);
    assert.equal(breakdown.discountTotal, 0);
    assert.equal(breakdown.total, 298);
    assert.equal(breakdown.currency, "USD");
  });

  it("charges neither tax nor shipping for an international order — nothing physically ships", () => {
    const breakdown = priceCart([{ product: product({ price: 79 }), quantity: 1 }], { shippingMethod: "international", country: "GB" });
    assert.equal(breakdown.taxTotal, 0);
    assert.equal(breakdown.shippingTotal, 0);
    assert.equal(breakdown.freeShipping, true);
    assert.equal(breakdown.subtotal, 79);
    assert.equal(breakdown.total, 79);
  });

  it("applies a percentage discount to the subtotal", () => {
    const discount: Discount = { code: "WELCOME10", kind: "percentage", amount: 10, minimumSubtotal: 0 };
    const breakdown = priceCart([{ product: product({ price: 230 }), quantity: 1 }], { discount, shippingMethod: "domestic", country: "US" });
    assert.equal(breakdown.subtotal, 230);
    assert.equal(breakdown.discountTotal, 23);
    assert.equal(breakdown.taxTotal, 0);
    assert.equal(breakdown.total, 207);
  });

  it("caps a fixed-amount discount at the subtotal (never goes negative)", () => {
    const discount: Discount = { code: "BIGFIXED", kind: "fixed_amount", amount: 100_000, minimumSubtotal: 0 };
    const breakdown = priceCart([{ product: product({ price: 100 }), quantity: 1 }], { discount, shippingMethod: "domestic", country: "US" });
    assert.equal(breakdown.discountTotal, breakdown.subtotal);
    assert.equal(breakdown.taxTotal, 0);
    assert.equal(breakdown.total, 0);
  });

  it("a free_shipping discount doesn't discount merchandise, and shipping is already $0 either way", () => {
    const discount: Discount = { code: "FREESHIP", kind: "free_shipping", amount: 0, minimumSubtotal: 0 };
    const breakdown = priceCart([{ product: product({ price: 120 }), quantity: 1 }], { discount, shippingMethod: "domestic", country: "US" });
    assert.equal(breakdown.discountTotal, 0);
    assert.equal(breakdown.shippingTotal, 0);
    assert.equal(breakdown.freeShipping, true);
    assert.equal(breakdown.taxTotal, 0);
    assert.equal(breakdown.total, 120);
  });

  it("gates a discount on minimumSubtotal", () => {
    const discount: Discount = { code: "BIGSPEND", kind: "percentage", amount: 20, minimumSubtotal: 1000 };
    const belowThreshold = priceCart([{ product: product({ price: 100 }), quantity: 1 }], { discount, shippingMethod: "domestic", country: "US" });
    assert.equal(belowThreshold.discountTotal, 0);

    const aboveThreshold = priceCart([{ product: product({ price: 1200 }), quantity: 1 }], { discount, shippingMethod: "domestic", country: "US" });
    assert.equal(aboveThreshold.discountTotal, 240);
  });

  it("is free for collection, domestic and international alike, since nothing physically ships", () => {
    for (const shippingMethod of ["collection", "domestic", "international"] as const) {
      const breakdown = priceCart([{ product: product({ price: 50 }), quantity: 1 }], { shippingMethod, country: "GB" });
      assert.equal(breakdown.shippingTotal, 0, `${shippingMethod}: shipping is $0`);
      assert.equal(breakdown.freeShipping, true, `${shippingMethod}: freeShipping is true`);
    }
  });
});

describe("shippingFor", () => {
  it("matches the configured domestic rate (currently $0 — every product is a digital download)", () => {
    assert.equal(
      shippingFor({ shippingMethod: "domestic", discountedMerchandiseInclVat: 100, freeShippingDiscount: false }),
      shopConfig.shipping.domestic
    );
  });

  it("matches the configured international rate", () => {
    assert.equal(
      shippingFor({ shippingMethod: "international", discountedMerchandiseInclVat: 100, freeShippingDiscount: false }),
      shopConfig.shipping.international
    );
  });

  it("is free at or above the configured free-shipping threshold", () => {
    assert.equal(
      shippingFor({ shippingMethod: "domestic", discountedMerchandiseInclVat: shopConfig.shipping.freeOverInclVat, freeShippingDiscount: false }),
      0
    );
  });

  it("is free even for a $1 cart, because the domestic/international rates are themselves $0", () => {
    assert.equal(shippingFor({ shippingMethod: "domestic", discountedMerchandiseInclVat: 1, freeShippingDiscount: false }), 0);
    assert.equal(shippingFor({ shippingMethod: "international", discountedMerchandiseInclVat: 1, freeShippingDiscount: false }), 0);
  });
});

describe("applyDiscount", () => {
  it("returns 0 when there is no discount", () => {
    assert.equal(applyDiscount(500, undefined), 0);
  });
});

describe("formatMoney", () => {
  it("formats USD at en-US with the currency symbol, grouped thousands and a decimal point", () => {
    const formatted = formatMoney(1234, "USD");
    assert.match(formatted, /^\$1,234\.00$/u);
  });

  it("defaults the locale to en-US", () => {
    assert.equal(formatMoney(10, "USD"), formatMoney(10, "USD", "en-US"));
  });
});

describe("availabilityLabel / isPurchasable", () => {
  it("treats in_stock with healthy inventory as purchasable and 'In stock'", () => {
    const p = product({ availability: "in_stock", inventory: 999 });
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
