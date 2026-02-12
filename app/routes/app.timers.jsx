import { Page, Layout, Card, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function TimersPage() {
  return (
    <Page>
      <TitleBar title="Timers" />
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="p" variant="bodyMd">
              Manage your timers here.
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
