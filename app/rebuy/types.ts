// Shared types for the Rebuy → checkout upsell proxy.

export interface RebuyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku?: string;
  compare_at_price?: string | null;
  inventory_quantity?: number;
  available?: boolean;
}

export interface RebuyImage {
  src: string;
}

export interface RebuyProduct {
  id: number;
  title: string;
  handle: string;
  status?: string;
  variants: RebuyVariant[];
  image?: RebuyImage | null;
  images?: RebuyImage[];
}

/** Normalized card the checkout extension renders. */
export interface UpsellCard {
  productId: number;
  title: string;
  image: string | null;
  price: string; // amount, e.g. "50.00"
  currencyCode: string;
  variantGid: string; // gid://shopify/ProductVariant/<id>
}
