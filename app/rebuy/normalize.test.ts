import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { normalize } from "./normalize";
import type { RebuyProduct, RebuyVariant } from "./types";

function variant(overrides: Partial<RebuyVariant> = {}): RebuyVariant {
  return {
    id: 11,
    product_id: 1,
    title: "Default",
    price: "50.00",
    inventory_quantity: 5,
    ...overrides,
  };
}

function product(overrides: Partial<RebuyProduct> = {}): RebuyProduct {
  return {
    id: 1,
    title: "Test product",
    handle: "test-product",
    status: "active",
    variants: [variant()],
    ...overrides,
  };
}

describe("normalize", () => {
  beforeEach(() => {
    delete process.env.SHOP_CURRENCY;
  });

  afterEach(() => {
    delete process.env.SHOP_CURRENCY;
  });

  it("maps an active product with a buyable variant to a card", () => {
    const result = normalize([product()]);

    expect(result).toEqual([
      {
        productId: 1,
        title: "Test product",
        image: null,
        price: "50.00",
        currencyCode: "USD",
        variantGid: "gid://shopify/ProductVariant/11",
      },
    ]);
  });

  it("defaults currency to USD and uses SHOP_CURRENCY when set", () => {
    expect(normalize([product()])[0].currencyCode).toBe("USD");

    process.env.SHOP_CURRENCY = "EUR";
    expect(normalize([product()])[0].currencyCode).toBe("EUR");
  });

  it("skips products that are not active", () => {
    const result = normalize([product({ status: "draft" })]);

    expect(result).toEqual([]);
  });

  it("includes products with no status field", () => {
    const result = normalize([product({ status: undefined })]);

    expect(result).toHaveLength(1);
  });

  it("skips products with no buyable variant", () => {
    const result = normalize([
      product({
        variants: [variant({ inventory_quantity: 0, available: false })],
      }),
    ]);

    expect(result).toEqual([]);
  });

  it("selects the first buyable variant, skipping out-of-stock ones", () => {
    const result = normalize([
      product({
        variants: [
          variant({ id: 11, inventory_quantity: 0, available: false }),
          variant({ id: 22, price: "75.00", inventory_quantity: 3 }),
        ],
      }),
    ]);

    expect(result[0].variantGid).toBe("gid://shopify/ProductVariant/22");
    expect(result[0].price).toBe("75.00");
  });

  it("treats a variant as buyable when available is true even with zero inventory", () => {
    const result = normalize([
      product({
        variants: [variant({ inventory_quantity: 0, available: true })],
      }),
    ]);

    expect(result).toHaveLength(1);
  });

  it("prefers image.src, then images[0].src, then null", () => {
    const withImage = normalize([
      product({ image: { src: "primary.jpg" } }),
    ]);
    expect(withImage[0].image).toBe("primary.jpg");

    const withImagesArray = normalize([
      product({ image: null, images: [{ src: "fallback.jpg" }] }),
    ]);
    expect(withImagesArray[0].image).toBe("fallback.jpg");

    const withoutImages = normalize([product()]);
    expect(withoutImages[0].image).toBeNull();
  });

  it("maps multiple products and drops the unbuyable ones", () => {
    const result = normalize([
      product({ id: 1 }),
      product({
        id: 2,
        variants: [variant({ inventory_quantity: 0, available: false })],
      }),
      product({ id: 3, variants: [variant({ id: 33 })] }),
    ]);

    expect(result.map((c) => c.productId)).toEqual([1, 3]);
  });
});
