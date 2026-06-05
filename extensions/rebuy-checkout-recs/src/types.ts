// Mirror of the backend's normalized card model (app/rebuy/types.ts).
export interface UpsellCard {
  productId: number;
  title: string;
  image: string | null;
  price: string; // amount, e.g. "50.00"
  currencyCode: string;
  variantGid: string; // gid://shopify/ProductVariant/<id>
}
