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

const premiumStyles = `
  .premium-usage-card {
    background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
    border: 1px solid rgba(0,0,0,0.05);
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
  }
  .premium-plan-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid transparent;
  }
  .premium-plan-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
    border-color: var(--p-color-border-interactive);
  }
  .highlight-popular {
    position: relative;
    border: 2px solid var(--p-color-border-interactive) !important;
    background: linear-gradient(to bottom, #ffffff, #f0f7ff);
  }
  .popular-badge {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    padding: 4px 12px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.5);
  }
  .toggle-container {
    background: #f3f4f6;
    padding: 4px;
    border-radius: 9999px;
    display: flex;
    gap: 4px;
    box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.06);
  }
  .toggle-btn {
    padding: 8px 20px;
    border-radius: 9999px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }
  .toggle-btn.active {
    background: white;
    color: #111827;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
  }
  .toggle-btn.inactive {
    background: transparent;
    color: #6b7280;
  }
  .toggle-btn.inactive:hover {
    color: #374151;
  }
`;

function UsageBar({ label, used, limit }) {
  const percent = limit === Infinity ? 0 : Math.min((used / limit) * 100, 100);
  const color = percent > 90 ? "#ef4444" : percent > 75 ? "#f59e0b" : "#10b981";
  
  return (
    <BlockStack gap="200">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Text as="span" variant="bodySm" fontWeight="medium">{label}</Text>
        <Text as="span" variant="bodySm" tone="subdued">
          <span style={{ fontWeight: "600", color: "#111827" }}>{used}</span> / {limit === Infinity ? "∞" : limit}
        </Text>
      </div>
      <div style={{ height: "6px", background: "#e5e7eb", borderRadius: "9999px", overflow: "hidden" }}>
        <div style={{ 
          width: `${percent}%`, 
          height: "100%", 
          background: color, 
          borderRadius: "9999px",
          transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: `0 0 10px ${color}40`
        }} />
      </div>
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
    <div className={`premium-plan-card ${plan.highlighted ? 'highlight-popular' : ''}`} style={{ height: '100%', borderRadius: '16px', display: 'flex' }}>
      <Card padding="500">
        <BlockStack gap="500">
          <BlockStack gap="300">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <Text as="h2" variant="headingLg" fontWeight="bold">
                {plan.name}
              </Text>
              {plan.badge && (
                <span className="popular-badge">{plan.badge}</span>
              )}
            </div>
            <div style={{ display: "flex", gap: "4px", alignItems: "baseline" }}>
              <span style={{ fontSize: "32px", fontWeight: "800", color: "#111827" }}>
                {plan.price}
              </span>
              {plan.period && (
                <Text as="span" variant="bodyMd" tone="subdued">
                  {plan.period}
                </Text>
              )}
            </div>
          </BlockStack>

          <Divider />

          <BlockStack gap="300">
            {plan.features.map((feature, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ 
                  flexShrink: 0, 
                  width: "20px", 
                  height: "20px", 
                  background: "#dcfce7", 
                  borderRadius: "50%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center" 
                }}>
                  <Icon source={CheckIcon} tone="success" />
                </div>
                <Text as="span" variant="bodyMd" tone="subdued">
                  {feature}
                </Text>
              </div>
            ))}
          </BlockStack>

          <div style={{ flexGrow: 1 }} />

          <BlockStack gap="200">
            {plan.trial && (
              <div style={{ textAlign: "center" }}>
                <Text as="p" variant="bodySm" fontWeight="medium" tone="highlight">
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
              {isCurrent ? "Active Plan" : plan.buttonLabel}
            </Button>
          </BlockStack>
        </BlockStack>
      </Card>
    </div>
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
      title="Upgrade Successful!"
      primaryAction={{
        content: "Explore My Benefits",
        onAction: onClose,
      }}
    >
      <Modal.Section>
        <BlockStack gap="500">
          <Box padding="600" background="bg-surface-secondary" borderRadius="400">
            <BlockStack gap="400" align="center">
              <div style={{ 
                background: "linear-gradient(135deg, #dcfce7 0%, #bcfabf 100%)", 
                padding: "20px", 
                borderRadius: "50%",
                display: "flex",
                boxShadow: "0 10px 15px -3px rgba(34, 197, 94, 0.2)"
              }}>
                <Icon source={StarFilledIcon} tone="success" />
              </div>
              <BlockStack gap="100" align="center">
                <Text as="h2" variant="headingLg" fontWeight="bold">
                  You're now on the {planName} Plan!
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                  Your store is now equipped with enterprise-level tools. Let's see how much more you can achieve!
                </Text>
              </BlockStack>
            </BlockStack>
          </Box>

          <BlockStack gap="300">
            <Text as="h3" variant="headingMd" fontWeight="semibold">
              Your Unlocked Potential:
            </Text>
            <PlanBenefits planId={planName} />
          </BlockStack>

          <Divider />

          <Text as="p" variant="bodySm" tone="subdued" alignment="center">
            Your billing has been updated. New limits are active immediately.
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
        "Full Customization",
        "Auto-Placement",
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
        "Priority Support",
        "Zero Branding",
      ],
      trial: "7-day free trial included",
      buttonLabel: "Start free trial",
      highlighted: false,
    },
    {
      name: "Growth",
      id: isYearly ? "Growth Annual" : "Growth",
      price: isYearly ? "$199" : "$19.99",
      period: isYearly ? "/ year" : "/ month",
      badge: "Most Popular",
      features: [
        "20 Active Sales",
        "20 Active Coupons",
        "20 Countdown Timers",
        "Advanced Analytics",
        "Custom Scheduling",
      ],
      trial: "7-day free trial included",
      buttonLabel: "Start free trial",
      highlighted: true,
    },
    {
      name: "Pro",
      id: isYearly ? "Pro Annual" : "Pro",
      price: isYearly ? "$299" : "$29.99",
      period: isYearly ? "/ year" : "/ month",
      features: [
        "Unlimited everything",
        "White-glove setup",
        "API Access",
        "Dedicated Manager",
      ],
      trial: "7-day free trial included",
      buttonLabel: "Start free trial",
      highlighted: false,
    },
  ];

  return (
    <Page title="" backAction={{ url: "/app" }}>
      <style>{premiumStyles}</style>
      <CelebrationModal 
        isOpen={showCelebrate} 
        onClose={handleCloseCelebration} 
        planName={planName} 
        celebrate={celebrate}
      />
      
      <BlockStack gap="800">
        <Layout>
          {actionData?.error && (
            <Layout.Section>
              <Banner title={actionData.error} tone="critical">
                {actionData.details && (
                  <pre style={{ fontSize: "12px", marginTop: "8px" }}>
                    {JSON.stringify(actionData.details, null, 2)}
                  </pre>
                )}
              </Banner>
            </Layout.Section>
          )}

          <Layout.Section>
            <div className="premium-usage-card" style={{ padding: "32px", borderRadius: "24px" }}>
              <BlockStack gap="500">
                <Box>
                  <Text as="h2" variant="headingLg" fontWeight="bold">Dashboard Usage</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">Monitor your active resources across your store.</Text>
                </Box>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "32px" }}>
                  <UsageBar label="Live Sales" used={usage.sales.used} limit={usage.sales.limit} />
                  <UsageBar label="Digital Coupons" used={usage.coupons.used} limit={usage.coupons.limit} />
                  <UsageBar label="Active Timers" used={usage.timers.used} limit={usage.timers.limit} />
                </div>
              </BlockStack>
            </div>
          </Layout.Section>

          <Layout.Section>
            <BlockStack gap="600">
              <BlockStack gap="400" align="center">
                <Text as="h2" variant="heading2xl" fontWeight="bold" alignment="center">Choose Your Plan</Text>
                <Text as="p" variant="bodyLg" tone="subdued" alignment="center" maxWidth="600px">
                  Unlock the full potential of your store with our premium features. 
                  All paid plans include a risk-free 7-day trial.
                </Text>
                
                <Box paddingBlockStart="400">
                  <div className="toggle-container">
                    <button 
                      className={`toggle-btn ${!isYearly ? 'active' : 'inactive'}`}
                      onClick={() => setIsYearly(false)}
                    >
                      Monthly
                    </button>
                    <button 
                      className={`toggle-btn ${isYearly ? 'active' : 'inactive'}`}
                      onClick={() => setIsYearly(true)}
                    >
                      Yearly (Save 20%)
                    </button>
                  </div>
                </Box>
              </BlockStack>
  
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "24px",
                alignItems: "stretch"
              }}>
                {plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} currentPlan={currentPlan} />
                ))}
              </div>
  
              <Box paddingBlockStart="400" paddingBlockEnd="800">
                <BlockStack gap="400">
                  <Divider />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      All plans include advanced filtering, product exclusion, and custom scheduling.
                    </Text>
                    <InlineStack gap="400">
                      <Button variant="plain" size="slim">Need Help?</Button>
                      {currentPlan !== "Free" && (
                        <Button variant="plain" tone="critical" url="/app/cancel" size="slim">Cancel Subscription</Button>
                      )}
                    </InlineStack>
                  </div>
                </BlockStack>
              </Box>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

