import { json, redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { Page, Layout, Card, Text, Button, BlockStack, Banner, InlineStack } from "@shopify/polaris";
import { useSubmit, useNavigation } from "@remix-run/react";

export async function loader({ request }) {
  const { billing } = await authenticate.admin(request);
  const subscription = await billing.require({
    plans: ["Basic", "Growth", "Pro", "Basic Annual", "Growth Annual", "Pro Annual"],
    isTest: process.env.BILLING_TEST_MODE === "true" || process.env.NODE_ENV !== "production",
    onFailure: async () => null,
  });

  if (!subscription) {
    return redirect("/app/pricing");
  }

  return json({ subscription });
}

export async function action({ request }) {
  const { billing } = await authenticate.admin(request);
  const subscription = await billing.require({
    plans: ["Basic", "Growth", "Pro", "Basic Annual", "Growth Annual", "Pro Annual"],
    isTest: process.env.NODE_ENV !== "production",
    onFailure: async () => null,
  });

  if (subscription) {
    await billing.cancel({
      subscriptionId: subscription.id,
      isTest: process.env.NODE_ENV !== "production",
      prorate: true,
    });
  }

  return redirect("/app/pricing?cancelled=true");
}

export default function Cancel() {
  const submit = useSubmit();
  const nav = useNavigation();
  const isLoading = nav.state === "submitting";

  return (
    <Page title="Cancel Subscription" backAction={{ url: "/app/pricing" }}>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Are you sure you want to cancel?</Text>
              <Text as="p">
                By cancelling your subscription, you will be moved to the **Free plan** at the end of your current billing period.
              </Text>
              <Banner tone="warning">
                <p>
                  Any active sales exceeding the Free plan limit (1 Sale) will be automatically deactivated. Coupons or timers exceeding the limits (5 Coupons, 2 Timers) will remain active, but you won't be able to create new ones until you are within your limits.
                </p>
              </Banner>
              <InlineStack align="end" gap="300">
                <Button onClick={() => window.history.back()}>Back</Button>
                <Button variant="primary" destructive loading={isLoading} onClick={() => submit({}, { method: "post" })}>
                  Confirm Cancellation
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
