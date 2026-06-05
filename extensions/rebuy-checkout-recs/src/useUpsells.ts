import { useEffect, useState } from "react";
import type { UpsellCard } from "./types";

export type UpsellStatus = "loading" | "success" | "empty" | "error";

/** Extract the numeric id from a Shopify GID (gid://shopify/Product/123 → 123). */
function numericId(gid: string): number {
  return Number(gid.split("/").pop());
}

interface UseUpsellsArgs {
  backendUrl: string;
  productIds: number[];
  maxCards: number;
  country?: string;
}

/**
 * Posts the current cart's product ids to the backend proxy and returns the
 * normalized, store-validated upsell cards. Refetches only when the set of
 * cart products changes; aborts in flight requests on unmount/refetch.
 */
export function useUpsells({
  backendUrl,
  productIds,
  maxCards,
  country,
}: UseUpsellsArgs) {
  const [status, setStatus] = useState<UpsellStatus>("loading");
  const [cards, setCards] = useState<UpsellCard[]>([]);

  // Stable dependency key so we don't refetch on every render.
  const key = productIds
    .slice()
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");

    fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds, maxCards, country }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Backend responded ${res.status}`);
        return res.json() as Promise<UpsellCard[]>;
      })
      .then((data) => {
        setCards(data);
        setStatus(data.length ? "success" : "empty");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("[rebuy] upsell fetch failed:", err);
        setStatus("error");
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendUrl, key, maxCards, country]);

  return { status, cards };
}

export { numericId };
