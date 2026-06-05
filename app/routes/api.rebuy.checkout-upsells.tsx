import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { fetchRebuyDatasource } from "../rebuy/client";
import { normalize } from "../rebuy/normalize";
import { validateVariants } from "../rebuy/validateVariants";

// The checkout sandbox calls this cross-origin, so every response must carry CORS
// headers and we must answer the OPTIONS preflight.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface UpsellRequest {
  productIds?: number[];
  country?: string;
  maxCards?: number;
}

// Handles CORS preflight (OPTIONS) and stray GETs.
export function loader() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return json(
      { error: "Method not allowed" },
      { status: 405, headers: CORS_HEADERS },
    );
  }

  let payload: UpsellRequest;
  try {
    payload = (await request.json()) as UpsellRequest;
  } catch {
    return json(
      { error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const productIds = Array.isArray(payload.productIds)
    ? payload.productIds.map(Number).filter((n) => Number.isFinite(n))
    : [];

  try {
    const raw = await fetchRebuyDatasource(productIds, payload.country);

    // Never recommend something already in the cart.
    const inCart = new Set(productIds);
    const cards = normalize(raw).filter((c) => !inCart.has(c.productId));

    const validated = await validateVariants(cards, payload.country);

    const max =
      Number(payload.maxCards) > 0 ? Number(payload.maxCards) : validated.length;
    return json(validated.slice(0, max), { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[rebuy] checkout-upsells failed:", error);
    // Fail soft: an empty list makes the extension render nothing.
    return json([], { headers: CORS_HEADERS });
  }
}
