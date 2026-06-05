import type { RebuyProduct, RebuyVariant, UpsellCard } from "./types";

function firstBuyableVariant(
  product: RebuyProduct,
): RebuyVariant | undefined {
  return product.variants?.find(
    (v) => (v.inventory_quantity ?? 0) > 0 || v.available === true,
  );
}

/**
 * Maps raw Rebuy products to the minimal card model the checkout extension needs.
 * Drops products with no buyable variant or that are not active, and converts the
 * numeric REST variant id into a Shopify GID for `applyCartLinesChange`.
 */
export function normalize(products: RebuyProduct[]): UpsellCard[] {
  const currencyCode = process.env.SHOP_CURRENCY || "USD";
  const cards: UpsellCard[] = [];

  for (const product of products) {
    if (product.status && product.status !== "active") continue;

    const variant = firstBuyableVariant(product);
    if (!variant) continue;

    cards.push({
      productId: product.id,
      title: product.title,
      image: product.image?.src ?? product.images?.[0]?.src ?? null,
      price: variant.price,
      currencyCode,
      variantGid: `gid://shopify/ProductVariant/${variant.id}`,
    });
  }

  return cards;
}
