import {
  InlineLayout,
  BlockStack,
  Image,
  Text,
  Button,
  View,
} from "@shopify/ui-extensions-react/checkout";
import type { UpsellCard } from "./types";

interface Props {
  card: UpsellCard;
  loading: boolean;
  formatPrice: (amount: number, currency: string) => string;
  onAdd: () => void;
}

export function RecommendationCard({
  card,
  loading,
  formatPrice,
  onAdd,
}: Props) {
  return (
    <InlineLayout
      columns={["auto", "fill", "auto"]}
      spacing="base"
      blockAlignment="center"
    >
      <View maxInlineSize={64}>
        {card.image ? (
          <Image
            source={card.image}
            description={card.title}
            cornerRadius="base"
          />
        ) : null}
      </View>

      <BlockStack spacing="extraTight">
        <Text size="small" emphasis="bold">
          {card.title}
        </Text>
        <Text size="small" appearance="subdued">
          {formatPrice(Number(card.price), card.currencyCode)}
        </Text>
      </BlockStack>

      <Button kind="secondary" loading={loading} onPress={onAdd}>
        Add
      </Button>
    </InlineLayout>
  );
}
