import { json, redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { Page, Layout, Card, Text, Button, BlockStack, Banner, InlineStack } from "@shopify/polaris";
import { useSubmit, useNavigation, useLoaderData } from "@remix-run/react";

/**
 * Fetches the current active subscription via GraphQL (not billing.require).
 * This avoids isTest mismatches and SDK quirks that cause crashes.
 */
async function getActiveSubscription(admin) {
  try {
    const response = await admin.graphql(`
      query {
        appInstallation {
          activeSubscriptions {
            id
            name
            status
            test
          }
        }
      }
    `);
    const data = await response.json();
    const subs = data?.data?.appInstallation?.activeSubscriptions || [];
    return subs.find(s => s.status === "ACTIVE") || null;
  } catch (error) {
    console.error("[Cancel] Failed to fetch subscription:", error);
    return null;
  }
}

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  const subscription = await getActiveSubscription(admin);

  if (!subscription) {
    // No active paid plan — redirect back to pricing
    return redirect("/app/pricing");
  }

  return json({ 
    subscriptionName: subscription.name,
    subscriptionId: subscription.id,
  });
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const subscription = await getActiveSubscription(admin);

  if (!subscription) {
    // Nothing to cancel
    return redirect("/app/pricing?cancelled=true");
  }

  try {
    // Cancel via GraphQL mutation (works for both test and real subscriptions)
    const response = await admin.graphql(`
      mutation appSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: { id: subscription.id },
    });

    const result = await response.json();
    const userErrors = result?.data?.appSubscriptionCancel?.userErrors || [];

    if (userErrors.length > 0) {
      console.error("[Cancel] GraphQL userErrors:", userErrors);
      return json({ error: userErrors.map(e => e.message).join(", ") }, { status: 400 });
    }

    console.log(`[Cancel] Successfully cancelled subscription ${subscription.id} for shop`);
  } catch (error) {
    console.error("[Cancel] Failed to cancel subscription:", error);
    return json({ error: "Failed to cancel subscription. Please try again." }, { status: 500 });
  }

  return redirect("/app/pricing?cancelled=true");
}

export default function Cancel() {
  const { subscriptionName } = useLoaderData();
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
                You are currently on the <strong>{subscriptionName}</strong> plan. By cancelling, you will be moved to the <strong>Free plan</strong>.
              </Text>
              <Banner tone="warning">
                <p>
                  Any active sales exceeding the Free plan limit (1 Sale) will be automatically deactivated. Coupons or timers exceeding the limits (5 Coupons, 2 Timers) will remain active, but you won't be able to create new ones until you are within your limits.
                </p>
              </Banner>
              <InlineStack align="end" gap="300">
                <Button onClick={() => window.history.back()}>Back</Button>
                <Button variant="primary" tone="critical" loading={isLoading} onClick={() => submit({}, { method: "post" })}>
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
