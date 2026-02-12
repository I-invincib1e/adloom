import { Page, Layout, Card, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function SetupPage() {
  return (
    <Page>
      <TitleBar title="Setup Guide" />
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="p" variant="bodyMd">
              Follow the setup guide to configure the app.
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
