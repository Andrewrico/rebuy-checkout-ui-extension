import {
  reactExtension,
  useApi,
  useCartLines,
  useApplyCartLinesChange,
  useInstructions,
  useSettings,
  BlockStack,
  Heading,
  Banner,
  SkeletonImage,
  SkeletonText,
} from "@shopify/ui-extensions-react/checkout";
import { useState } from "react";
import { BACKEND_URL, DEFAULT_HEADING, DEFAULT_MAX_CARDS } from "./config";
import { useUpsells, numericId } from "./useUpsells";
import { RecommendationCard } from "./RecommendationCard";
import type { UpsellCard } from "./types";

export default reactExtension("purchase.checkout.block.render", () => <App />);

function App() {
  const { i18n, localization } = useApi();
  const instructions = useInstructions();
  const settings = useSettings();
  const lines = useCartLines();
  const applyCartLinesChange = useApplyCartLinesChange();

  const heading = (settings.heading as string) || DEFAULT_HEADING;
  const maxCards =
    Number(settings.max_cards) > 0
      ? Number(settings.max_cards)
      : DEFAULT_MAX_CARDS;
  const backendUrl = (settings.backend_url as string) || BACKEND_URL;
  const country = localization?.country?.current?.isoCode;

  const productIds = lines.map((line) => numericId(line.merchandise.product.id));

  const { status, cards } = useUpsells({
    backendUrl,
    productIds,
    maxCards,
    country,
  });

  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Don't render if checkout can't accept new lines (e.g. accelerated checkouts).
  if (!instructions.lines.canAddCartLine) return null;

  if (status === "loading") {
    return (
      <BlockStack spacing="base">
        <Heading level={2}>{heading}</Heading>
        <SkeletonImage blockSize={64} inlineSize={64} />
        <SkeletonText />
      </BlockStack>
    );
  }

  // Render nothing on error or when there's nothing to show — never a broken UI.
  if (status === "error" || cards.length === 0) return null;

  async function onAdd(card: UpsellCard) {
    setError(null);
    setPendingId(card.variantGid);
    try {
      const result = await applyCartLinesChange({
        type: "addCartLine",
        merchandiseId: card.variantGid,
        quantity: 1,
      });
      if (result.type === "error") {
        setError(result.message || "Sorry, this item couldn't be added.");
      }
    } finally {
      setPendingId(null);
    }
  }

  return (
    <BlockStack spacing="base">
      <Heading level={2}>{heading}</Heading>
      {error ? <Banner status="critical">{error}</Banner> : null}
      {cards.map((card) => (
        <RecommendationCard
          key={card.variantGid}
          card={card}
          loading={pendingId === card.variantGid}
          formatPrice={(amount, currency) =>
            i18n.formatCurrency(amount, { currency })
          }
          onAdd={() => onAdd(card)}
        />
      ))}
    </BlockStack>
  );
}
