import { Page, Layout, Card, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function PricingPage() {
  return (
    <Page>
      <TitleBar title="Pricing Plans" />
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="p" variant="bodyMd">
              View and manage pricing plans here.
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
