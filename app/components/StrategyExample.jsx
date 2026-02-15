import { BlockStack, Box, InlineStack, Text, Badge, Icon } from "@shopify/polaris";
import { ArrowRightIcon, InfoIcon } from "@shopify/polaris-icons";

export function StrategyExample({ strategy, discountType, value }) {
  const discountVal = parseFloat(value) || 0;
  const isPercentage = discountType === "PERCENTAGE";
  const discountLabel = isPercentage ? `${discountVal}%` : `$${discountVal}`;

  // Mock data for examples
  const examples = {
    COMPARE_AT: {
      desc: "Uses the product's Compare-at price as the base for the discount.",
      pre: { price: 100, compareAt: 150 },
      post: (p, c) => ({
        price: isPercentage ? c - (c * discountVal / 100) : c - discountVal,
        compareAt: c
      })
    },
    KEEP_COMPARE_AT: {
      desc: "Discounts the current price while keeping the existing Compare-at price unchanged.",
      pre: { price: 100, compareAt: 150 },
      post: (p, c) => ({
        price: isPercentage ? p - (p * discountVal / 100) : p - discountVal,
        compareAt: c
      })
    },
    USE_CURRENT_AS_COMPARE: {
      desc: "Moves the current price to Compare-at, then applies the discount to the new price.",
      pre: { price: 100, compareAt: null },
      post: (p, c) => ({
        price: isPercentage ? p - (p * discountVal / 100) : p - discountVal,
        compareAt: p
      })
    },
    INCREASE_COMPARE: {
      desc: "Keeps the current price but increases the Compare-at price to create a perceived saving.",
      pre: { price: 100, compareAt: null },
      post: (p, c) => ({
        price: p,
        compareAt: isPercentage ? p / (1 - discountVal / 100) : p + discountVal
      })
    }
  };

  const ex = examples[strategy] || examples.COMPARE_AT;
  const result = ex.post(ex.pre.price, ex.pre.compareAt);

  const PriceCard = ({ title, price, compareAt, isResult }) => (
    <div style={{
      background: isResult ? "#f0fdf4" : "#ffffff",
      border: `1px solid ${isResult ? "#bbf7d0" : "#e5e7eb"}`,
      borderRadius: "12px",
      padding: "16px",
      flex: 1,
      boxShadow: isResult ? "0 4px 6px -1px rgba(34, 197, 94, 0.1)" : "none",
      transition: "all 0.3s ease"
    }}>
      <BlockStack gap="200">
        <Text variant="bodyXs" fontWeight="bold" tone="subdued">{title}</Text>
        <BlockStack gap="0">
          <Text variant="headingLg" as="p" fontWeight="bold">${price.toFixed(2)}</Text>
          {compareAt && (
            <Text variant="bodySm" tone="subdued" textDecorationLine="line-through">${compareAt.toFixed(2)}</Text>
          )}
        </BlockStack>
      </BlockStack>
    </div>
  );

  return (
    <Box padding="400" background="bg-surface-secondary" borderRadius="300" borderStyle="dashed" borderWidth="025" borderColor="border-brand">
      <BlockStack gap="400">
        <InlineStack align="start" gap="200" wrap={false}>
          <div style={{ color: "var(--p-color-text-info)", marginTop: "2px" }}>
            <Icon source={InfoIcon} tone="info" />
          </div>
          <Text as="p" variant="bodyMd" tone="subdued">
            In this example, a <span style={{ fontWeight: "600", color: "var(--p-color-text)" }}>{discountLabel} discount</span> is being used.
          </Text>
        </InlineStack>

        <InlineStack gap="400" align="center" blockAlign="center" wrap={false}>
          <PriceCard title="BEFORE" price={ex.pre.price} compareAt={ex.pre.compareAt} />
          
          <div style={{ color: "var(--p-color-text-subdued)" }}>
            <Icon source={ArrowRightIcon} />
          </div>

          <PriceCard title="AFTER" price={result.price} compareAt={result.compareAt} isResult />
        </InlineStack>

        <Box paddingInlineStart="200" borderInlineStartWidth="050" borderColor="border-brand">
          <Text as="p" variant="bodySm" tone="subdued">{ex.desc}</Text>
        </Box>
      </BlockStack>
    </Box>
  );
}
