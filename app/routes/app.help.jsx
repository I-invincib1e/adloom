import { Page, Layout, Card, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function SupportPage() {
  return (
    <Page>
      <TitleBar title="Help & Support" />
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="p" variant="bodyMd">
              Get help and support for the app here.
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
