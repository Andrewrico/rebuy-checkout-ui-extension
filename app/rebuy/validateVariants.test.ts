import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateVariants } from "./validateVariants";
import type { UpsellCard } from "./types";

const GID_A = "gid://shopify/ProductVariant/1";
const GID_B = "gid://shopify/ProductVariant/2";

function card(overrides: Partial<UpsellCard> = {}): UpsellCard {
  return {
    productId: 100,
    title: "Test product",
    image: null,
    price: "50.00",
    currencyCode: "USD",
    variantGid: GID_A,
    ...overrides,
  };
}

/** Builds a Storefront `nodes` response body. */
function nodesResponse(nodes: unknown[]) {
  return {
    ok: true,
    json: async () => ({ data: { nodes } }),
  } as Response;
}

describe("validateVariants", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    process.env.STOREFRONT_DOMAIN = "developfy101.myshopify.com";
    process.env.STOREFRONT_TOKEN = "test-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.STOREFRONT_DOMAIN;
    delete process.env.STOREFRONT_TOKEN;
  });

  it("returns an empty array without calling the API when there are no cards", async () => {
    const result = await validateVariants([]);

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips validation and returns cards unchanged when Storefront creds are missing", async () => {
    delete process.env.STOREFRONT_DOMAIN;
    delete process.env.STOREFRONT_TOKEN;
    const cards = [card()];

    const result = await validateVariants(cards);

    expect(result).toEqual(cards);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("overwrites price and currency with the contextual presentment price", async () => {
    fetchMock.mockResolvedValue(
      nodesResponse([
        {
          id: GID_A,
          availableForSale: true,
          price: { amount: "46.20", currencyCode: "EUR" },
        },
      ]),
    );

    const result = await validateVariants([card()], "DE");

    expect(result).toEqual([
      expect.objectContaining({
        variantGid: GID_A,
        price: "46.20",
        currencyCode: "EUR",
      }),
    ]);
  });

  it("sends the @inContext directive and country variable when a country is given", async () => {
    fetchMock.mockResolvedValue(
      nodesResponse([
        {
          id: GID_A,
          availableForSale: true,
          price: { amount: "46.20", currencyCode: "EUR" },
        },
      ]),
    );

    await validateVariants([card()], "DE");

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.query).toContain("@inContext(country: $country)");
    expect(body.query).toContain("$country: CountryCode!");
    expect(body.variables).toEqual({ ids: [GID_A], country: "DE" });
  });

  it("omits the @inContext directive when no country is given", async () => {
    fetchMock.mockResolvedValue(
      nodesResponse([
        {
          id: GID_A,
          availableForSale: true,
          price: { amount: "50.00", currencyCode: "USD" },
        },
      ]),
    );

    await validateVariants([card()]);

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.query).not.toContain("@inContext");
    expect(body.variables).toEqual({ ids: [GID_A] });
  });

  it("drops variants that are not available for sale or do not resolve", async () => {
    const cards = [card({ variantGid: GID_A }), card({ variantGid: GID_B })];
    fetchMock.mockResolvedValue(
      nodesResponse([
        {
          id: GID_A,
          availableForSale: true,
          price: { amount: "10.00", currencyCode: "USD" },
        },
        { id: GID_B, availableForSale: false },
        null,
      ]),
    );

    const result = await validateVariants(cards, "US");

    expect(result).toHaveLength(1);
    expect(result[0].variantGid).toBe(GID_A);
  });

  it("keeps the original price when a buyable node has no price", async () => {
    fetchMock.mockResolvedValue(
      nodesResponse([{ id: GID_A, availableForSale: true }]),
    );

    const result = await validateVariants([card()], "US");

    expect(result[0].price).toBe("50.00");
    expect(result[0].currencyCode).toBe("USD");
  });

  it("throws when the Storefront API responds with a non-ok status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 } as Response);

    await expect(validateVariants([card()], "US")).rejects.toThrow(
      "Storefront validation failed: 401",
    );
  });
});
