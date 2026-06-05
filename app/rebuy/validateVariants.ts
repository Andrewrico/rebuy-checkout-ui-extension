import type { UpsellCard } from "./types";

const STOREFRONT_API_VERSION = "2025-01";

interface VariantNode {
  id: string;
  availableForSale?: boolean;
  price?: { amount: string; currencyCode: string };
}

// The `@inContext(country:)` directive makes the Storefront API return the
// variant's presentment price — converted into the buyer's currency — instead of
// the shop's base-currency price. Only added when we know the buyer's country.
function buildValidateQuery(withContext: boolean): string {
  const decl = withContext
    ? "($ids: [ID!]!, $country: CountryCode!)"
    : "($ids: [ID!]!)";
  const directive = withContext ? " @inContext(country: $country)" : "";
  return `
    query ValidateVariants${decl}${directive} {
      nodes(ids: $ids) {
        ... on ProductVariant {
          id
          availableForSale
          price {
            amount
            currencyCode
          }
        }
      }
    }
  `;
}

/**
 * Confirms each variant GID actually exists on this store and is buyable, using
 * the Storefront API. Variants that don't resolve (wrong store / unpublished) or
 * are not available for sale are dropped before they reach checkout.
 *
 * Also overwrites each card's price/currency with the variant's presentment price
 * in the buyer's currency (via `@inContext(country:)`), so checkout shows the
 * correctly-converted amount instead of the shop's base-currency price.
 *
 * If Storefront credentials are absent, falls back to trusting the datasource
 * (it is already scoped to this store in the Rebuy admin) and logs a warning.
 */
export async function validateVariants(
  cards: UpsellCard[],
  country?: string,
): Promise<UpsellCard[]> {
  if (!cards.length) return [];

  const domain = process.env.STOREFRONT_DOMAIN;
  const token = process.env.STOREFRONT_TOKEN;
  if (!domain || !token) {
    console.warn(
      "[rebuy] STOREFRONT_DOMAIN/STOREFRONT_TOKEN missing — skipping variant validation",
    );
    return cards;
  }

  const ids = cards.map((c) => c.variantGid);
  const withContext = Boolean(country);
  const variables = withContext ? { ids, country } : { ids };

  const res = await fetch(
    `https://${domain}/api/${STOREFRONT_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token,
      },
      body: JSON.stringify({
        query: buildValidateQuery(withContext),
        variables,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Storefront validation failed: ${res.status}`);
  }

  const body = (await res.json()) as {
    data?: { nodes: (VariantNode | null)[] };
  };

  const buyableById = new Map(
    (body.data?.nodes ?? [])
      .filter((n): n is VariantNode => !!n && n.availableForSale === true)
      .map((n) => [n.id, n] as const),
  );

  return cards
    .filter((c) => buyableById.has(c.variantGid))
    .map((c) => {
      const price = buyableById.get(c.variantGid)?.price;
      // Use the contextual presentment price when present; otherwise keep the
      // datasource's base-currency price as a fallback.
      return price
        ? { ...c, price: price.amount, currencyCode: price.currencyCode }
        : c;
    });
}
