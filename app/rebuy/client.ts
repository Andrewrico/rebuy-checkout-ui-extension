import type { RebuyProduct } from "./types";

const REBUY_BASE = "https://rebuyengine.com/api/v1";

/**
 * Calls Rebuy datasource 300871 server-side. The Rebuy API key never leaves the
 * backend — it is read from the environment here, not passed from checkout.
 */
export async function fetchRebuyDatasource(
  productIds: number[],
  country?: string,
): Promise<RebuyProduct[]> {
  const key = process.env.REBUY_API_KEY;
  if (!key) throw new Error("REBUY_API_KEY is not set");

  const datasourceId = process.env.REBUY_DATASOURCE_ID || "300871";

  const url = new URL(`${REBUY_BASE}/custom/id/${datasourceId}`);
  url.searchParams.set("key", key);
  if (productIds.length) {
    url.searchParams.set("shopify_product_ids", productIds.join(","));
  }
  url.searchParams.set("limit", process.env.REBUY_LIMIT || "8");
  url.searchParams.set("filter_oos", "yes");
  if (country) url.searchParams.set("country_code", country);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Rebuy request failed: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as { data?: RebuyProduct[] };
  return body.data ?? [];
}
