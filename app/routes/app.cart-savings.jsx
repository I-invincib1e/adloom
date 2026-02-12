import { Page, Layout, Card, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function CartSavingsPage() {
  return (
    <Page>
      <TitleBar title="Cart Savings" />
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="p" variant="bodyMd">
              Configure cart savings settings here.
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
