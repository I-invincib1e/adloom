import { Page, Layout, Card, Text, BlockStack, InlineStack, Button, Icon, Divider, Box, Badge } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { CheckIcon } from "@shopify/polaris-icons";

const plans = [
  {
    name: "Free",
    price: "Free",
    period: "",
    yearlyNote: "",
    badge: null,
    features: [
      "Up to 50 product variants on sale",
      "1 Countdown timer",
      "Advanced filtering",
      "Product exclusion",
      "Sale scheduling",
      "Product tagging",
    ],
    trial: null,
    buttonLabel: "Current plan",
    buttonDisabled: true,
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$7.99",
    period: "/ month",
    yearlyNote: "or $76.70/year and save 20%",
    badge: null,
    features: [
      "Up to 2,000 product variants on sale",
      "5 Countdown timers",
      "Advanced filtering",
      "Product exclusion",
      "Sale scheduling",
      "Product tagging",
    ],
    trial: "3-day free trial",
    buttonLabel: "Start free trial",
    buttonDisabled: false,
    highlighted: false,
  },
  {
    name: "Plus",
    price: "$12.99",
    period: "/ month",
    yearlyNote: "or $124.70/year and save 20%",
    badge: "Most popular",
    features: [
      "Up to 20,000 product variants on sale",
      "100 Countdown timers",
      "Advanced filtering",
      "Product exclusion",
      "Sale scheduling",
      "Product tagging",
    ],
    trial: "3-day free trial",
    buttonLabel: "Start free trial",
    buttonDisabled: false,
    highlighted: true,
  },
  {
    name: "Professional",
    price: "$29.99",
    period: "/ month",
    yearlyNote: "or $287.90/year and save 20%",
    badge: null,
    features: [
      "Unlimited product variants on sale",
      "Unlimited Countdown timers",
      "Advanced filtering",
      "Product exclusion",
      "Sale scheduling",
      "Product tagging",
    ],
    trial: null,
    buttonLabel: "Start free trial",
    buttonDisabled: false,
    highlighted: false,
  },
];

function PlanCard({ plan }) {
  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd" fontWeight="bold">
              {plan.name}
            </Text>
            {plan.badge && (
              <Badge tone="info">{plan.badge}</Badge>
            )}
          </InlineStack>
          <InlineStack gap="100" blockAlign="baseline">
            <Text as="p" variant="headingLg" fontWeight="bold">
              {plan.price}
            </Text>
            {plan.period && (
              <Text as="span" variant="bodySm" tone="subdued">
                {plan.period}
              </Text>
            )}
          </InlineStack>
          {plan.yearlyNote && (
            <Text as="p" variant="bodySm" tone="subdued">
              {plan.yearlyNote}
            </Text>
          )}
        </BlockStack>

        <Divider />

        <BlockStack gap="300">
          {plan.features.map((feature, i) => (
            <InlineStack key={i} gap="200" blockAlign="center" wrap={false}>
              <div style={{ flexShrink: 0 }}>
                <Icon source={CheckIcon} tone="success" />
              </div>
              <Text as="span" variant="bodyMd">
                {feature}
              </Text>
            </InlineStack>
          ))}
        </BlockStack>

        {plan.trial && (
          <Text as="p" variant="bodySm" tone="subdued" alignment="center">
            {plan.trial}
          </Text>
        )}

        <Button
          variant={plan.highlighted ? "primary" : "secondary"}
          fullWidth
          disabled={plan.buttonDisabled}
          size="large"
        >
          {plan.buttonLabel}
        </Button>
      </BlockStack>
    </Card>
  );
}

export default function PricingPage() {
  return (
    <Page title="Pricing plans" backAction={{ url: "/app" }}>
      <Layout>
        <Layout.Section>
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd" tone="subdued">
              Choose the plan that fits your store. All paid plans include a 3-day free trial.
            </Text>
          </BlockStack>
        </Layout.Section>

        {plans.map((plan) => (
          <Layout.Section key={plan.name} variant="oneQuarter">
            <PlanCard plan={plan} />
          </Layout.Section>
        ))}

        <Layout.Section>
          <Box paddingBlockStart="400" paddingBlockEnd="800">
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                All plans include advanced filtering, product exclusion, sale scheduling, and product tagging.
              </Text>
              <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                Need help choosing? <Button variant="plain" size="slim">Contact us</Button>
              </Text>
            </BlockStack>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
