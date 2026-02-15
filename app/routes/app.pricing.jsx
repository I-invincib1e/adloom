import { useState, useEffect } from "react";
import { Page, Layout, Card, Text, BlockStack, InlineStack, Button, Icon, Divider, Box, Badge, ProgressBar, Banner, Modal } from "@shopify/polaris";
import { CheckIcon, StarFilledIcon } from "@shopify/polaris-icons";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData, useNavigate, useLocation } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getPlanUsage } from "../models/billing.server";

export async function loader({ request }) {
  await authenticate.admin(request);
  const usage = await getPlanUsage(request);
  const url = new URL(request.url);
  const celebrate = url.searchParams.get("celebrate") === "true";
  const planName = url.searchParams.get("plan");
  return json({ usage, celebrate, planName });
}

export async function action({ request }) {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const plan = formData.get("plan");

  if (plan === "Free") {
    const subscription = await billing.require({
        plans: ["Basic", "Growth", "Pro", "Basic Annual", "Growth Annual", "Pro Annual"],
        isTest: true,
        onFailure: async () => null,
    });
    
    if (subscription) {
        await billing.cancel({
            subscriptionId: subscription.id,
            isTest: true,
            prorate: true,
        });
    }
    return json({ success: true });
  }

  const url = new URL(request.url);
  const returnUrl = `${url.origin}/app/pricing?celebrate=true&plan=${plan}`;

  try {
    await billing.request({
      plan: plan,
      isTest: true,
      returnUrl,
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error.errorData) {
      return json({ error: "Billing Error", details: error.errorData }, { status: 400 });
    }
    return json({ error: error.message || "An unexpected error occurred" }, { status: 500 });
  }
  
  return null;
}

function UsageBar({ label, used, limit }) {
  const percent = limit === Infinity ? 0 : Math.min((used / limit) * 100, 100);
  const color = percent > 90 ? "critical" : percent > 75 ? "highlight" : "success";
  
  return (
    <BlockStack gap="100">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Text as="span" variant="bodySm">{label}</Text>
        <Text as="span" variant="bodySm" tone="subdued">
          {used} / {limit === Infinity ? "∞" : limit} active
        </Text>
      </div>
      <ProgressBar progress={percent} tone={color} size="small" />
    </BlockStack>
  );
}

function PlanCard({ plan, currentPlan }) {
  const submit = useSubmit();
  const isCurrent = plan.id === currentPlan;
  
  const handleSelect = () => {
    submit({ plan: plan.id }, { method: "post" });
  };

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="200">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text as="h2" variant="headingMd" fontWeight="bold">
              {plan.name}
            </Text>
            {plan.badge && (
              <Badge tone="info">{plan.badge}</Badge>
            )}
          </div>
          <div style={{ display: "flex", gap: "4px", alignItems: "baseline" }}>
            <Text as="p" variant="headingLg" fontWeight="bold">
              {plan.price}
            </Text>
            {plan.period && (
              <Text as="span" variant="bodySm" tone="subdued">
                {plan.period}
              </Text>
            )}
          </div>
        </BlockStack>

        <Divider />

        <BlockStack gap="300">
          {plan.features.map((feature, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{ flexShrink: 0 }}>
                <Icon source={CheckIcon} tone="success" />
              </div>
              <Text as="span" variant="bodyMd">
                {feature}
              </Text>
            </div>
          ))}
        </BlockStack>

        {plan.trial && (
          <div style={{ textAlign: "center" }}>
            <Text as="p" variant="bodySm" tone="subdued">
              {plan.trial}
            </Text>
          </div>
        )}

        <Button
          variant={plan.highlighted ? "primary" : "secondary"}
          fullWidth
          disabled={isCurrent}
          onClick={handleSelect}
          size="large"
        >
          {isCurrent ? "Current Plan" : plan.buttonLabel}
        </Button>
      </BlockStack>
    </Card>
  );
}

function PlanBenefits({ planId }) {
  const benefits = {
    "Basic": [
      "Up to 5 Active Sales",
      "Up to 5 Active Coupons",
      "Up to 5 Countdown Timers",
      "7-day trial period",
    ],
    "Growth": [
      "Up to 20 Active Sales",
      "Up to 20 Active Coupons",
      "Up to 20 Countdown Timers",
      "Most popular features included",
      "7-day trial period",
    ],
    "Pro": [
      "Unlimited Active Sales",
      "Unlimited Active Coupons",
      "Unlimited Active Timers",
      "Priority features",
      "7-day trial period",
    ],
  };

  const cleanId = planId?.replace(" Annual", "");
  const planBenefits = benefits[cleanId] || benefits["Basic"];

  return (
    <BlockStack gap="200">
      {planBenefits.map((benefit, i) => (
        <InlineStack key={i} gap="200" blockAlign="center" wrap={false}>
          <Icon source={CheckIcon} tone="success" />
          <Text as="span" variant="bodyMd">{benefit}</Text>
        </InlineStack>
      ))}
    </BlockStack>
  );
}

function CelebrationModal({ isOpen, onClose, planName }) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="You've Successfully Upgraded!"
      primaryAction={{
        content: "Get Started",
        onAction: onClose,
      }}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Box padding="400" background="bg-surface-secondary" borderRadius="200">
            <BlockStack gap="400" align="center">
              <div style={{ 
                background: "var(--p-color-bg-fill-success-secondary)", 
                padding: "16px", 
                borderRadius: "50%",
                display: "flex"
              }}>
                <Icon source={StarFilledIcon} tone="success" />
              </div>
              <BlockStack gap="100" align="center">
                <Text as="h2" variant="headingLg" fontWeight="bold">
                  Welcome to the {planName} Plan!
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                  Thank you for upgrading! Your store now has access to powerful new features to boost your sales.
                </Text>
              </BlockStack>
            </BlockStack>
          </Box>

          <BlockStack gap="300">
            <Text as="h3" variant="headingMd" fontWeight="semibold">
              Your New Benefits:
            </Text>
            <PlanBenefits planId={planName} />
          </BlockStack>

          <Divider />

          <Text as="p" variant="bodySm" tone="subdued" alignment="center">
            You're all set! Your new limits are active immediately.
          </Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

export default function PricingPage() {
  const { usage, celebrate, planName } = useLoaderData();
  const actionData = useActionData();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPlan = usage?.plan || "Free";
  const [isYearly, setIsYearly] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(false);

  useEffect(() => {
    if (celebrate) {
      setShowCelebrate(true);
      // Clean up URL without reload
      const newUrl = location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [celebrate, location.pathname]);

  const handleCloseCelebration = () => {
    setShowCelebrate(false);
    navigate(location.pathname, { replace: true });
  };

  const plans = [
    {
      name: "Free",
      id: "Free",
      price: "Free",
      period: "",
      features: [
        "1 Active Sale",
        "2 Active Coupons",
        "1 Countdown Timer",
        "Advanced filtering",
        "Product exclusion",
        "Sale scheduling",
      ],
      buttonLabel: "Current plan",
      highlighted: false,
    },
    {
      name: "Basic",
      id: isYearly ? "Basic Annual" : "Basic",
      price: isYearly ? "$99" : "$9.99",
      period: isYearly ? "/ year" : "/ month",
      features: [
        "5 Active Sales",
        "5 Active Coupons",
        "5 Countdown Timers",
        "Advanced filtering",
        "Product exclusion",
        "Sale scheduling",
      ],
      trial: "7-day free trial",
      buttonLabel: "Start free trial",
      highlighted: false,
    },
    {
      name: "Growth",
      id: isYearly ? "Growth Annual" : "Growth",
      price: isYearly ? "$199" : "$19.99",
      period: isYearly ? "/ year" : "/ month",
      badge: "Most popular",
      features: [
        "20 Active Sales",
        "20 Active Coupons",
        "20 Countdown Timers",
        "Advanced filtering",
        "Product exclusion",
        "Sale scheduling",
      ],
      trial: "7-day free trial",
      buttonLabel: "Start free trial",
      highlighted: true,
    },
    {
      name: "Pro",
      id: isYearly ? "Pro Annual" : "Pro",
      price: isYearly ? "$299" : "$29.99",
      period: isYearly ? "/ year" : "/ month",
      features: [
        "Unlimited active sales",
        "Unlimited active coupons",
        "Unlimited active timers",
        "Advanced filtering",
        "Product exclusion",
        "Sale scheduling",
      ],
      trial: "7-day free trial",
      buttonLabel: "Start free trial",
      highlighted: false,
    },
  ];

  return (
    <Page title="Pricing & Usage" backAction={{ url: "/app" }}>
      <CelebrationModal 
        isOpen={showCelebrate} 
        onClose={handleCloseCelebration} 
        planName={planName} 
      />
      <BlockStack gap="400">
        {actionData?.error && (
          <Banner title={actionData.error} tone="critical">
            {actionData.details ? (
              <div style={{ marginTop: "8px" }}>
                <Text as="p" variant="bodyMd">Details:</Text>
                <div style={{ 
                  background: "rgba(0,0,0,0.05)", 
                  padding: "8px", 
                  borderRadius: "4px", 
                  marginTop: "4px",
                  overflowX: "auto"
                }}>
                  <pre style={{ margin: 0, fontSize: "12px" }}>
                    {JSON.stringify(actionData.details, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p>{actionData.error}</p>
            )}
          </Banner>
        )}
        <Layout>
          <Layout.Section>
             <Card>
               <BlockStack gap="400">
                 <Text as="h2" variant="headingMd">Current Usage</Text>
                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                   <UsageBar label="Sales" used={usage.sales.used} limit={usage.sales.limit} />
                   <UsageBar label="Coupons" used={usage.coupons.used} limit={usage.coupons.limit} />
                   <UsageBar label="Timers" used={usage.timers.used} limit={usage.timers.limit} />
                 </div>
               </BlockStack>
             </Card>
          </Layout.Section>
          <Layout.Section>
            <BlockStack gap="600">
              <BlockStack gap="200" align="center">
                <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                  Choose the plan that fits your store. All paid plans include a 7-day free trial.
                </Text>
                
                <Box paddingBlockStart="200">
                  <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
                     <Button 
                      variant={!isYearly ? "primary" : "secondary"} 
                      onClick={() => setIsYearly(false)}
                      size="slim"
                    >
                      Monthly
                    </Button>
                    <Button 
                      variant={isYearly ? "primary" : "secondary"} 
                      onClick={() => setIsYearly(true)}
                      size="slim"
                    >
                      Yearly (Save 20%)
                    </Button>
                  </div>
                </Box>
              </BlockStack>
  
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "16px",
              }}>
                {plans.map((plan) => (
                  <div key={plan.id} style={plan.highlighted ? {
                    border: "2px solid var(--p-color-border-interactive)",
                    borderRadius: "12px",
                  } : {}}>
                    <PlanCard plan={plan} currentPlan={currentPlan} />
                  </div>
                ))}
              </div>
  
              <Box paddingBlockStart="200" paddingBlockEnd="600">
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                    All plans include advanced filtering, product exclusion, sale scheduling, and product tagging.
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                    Need help choosing? <Button variant="plain" size="slim">Contact us</Button>
                  </Text>
                  {currentPlan !== "Free" && (
                    <Box paddingBlockStart="400">
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <Button variant="plain" tone="critical" url="/app/cancel">Cancel subscription</Button>
                      </div>
                    </Box>
                  )}
                </BlockStack>
              </Box>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
