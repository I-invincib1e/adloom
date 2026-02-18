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
  const { billing, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const plan = formData.get("plan");

  console.log(`[Billing Debug] Action started for shop: ${shop}`);
  console.log(`[Billing Debug] Form data plan: ${plan}`);

  const url = new URL(request.url);
  // Reverting to dynamic isTest to be safe. 
  // If shop is active dev store, it should be true. If it's a real store on a trial, false.
  // For now, let's trust the shop domain check or defaulting to false for production readiness.
  // Disable test charges in production (Railway), enable in dev.
  const isTest = process.env.NODE_ENV !== "production";
  /* 
   * Post-Payment Redirect Fix:
   * 1. Ensure returnUrl uses the explicit SHOPIFY_APP_URL from env to avoid mismatch.
   * 2. The AppProvider in root.jsx will handle the session token handshake on return.
   */
  const appUrl = process.env.SHOPIFY_APP_URL || url.origin;
  const returnUrl = `${appUrl}/app/pricing?upgraded=true&plan=${plan}`; // Use upgraded=true per new flow

  console.log(`[Billing Debug] SHOPIFY_APP_URL: ${process.env.SHOPIFY_APP_URL}`);
  console.log(`[Billing Debug] Requesting plan: ${plan}, isTest: ${isTest}, returnUrl: ${returnUrl}`);

  try {
    const confirmation = await billing.request({
      plan: plan,
      isTest: isTest,
      returnUrl,
    });
    console.log(`[Billing Debug] Request successful. Redirecting to:`, confirmation);
    return confirmation;
  } catch (error) {
    if (error instanceof Response) {
        console.log(`[Billing Debug] Caught Redirect Response (Normal Flow)`);
        throw error;
    }
    
    console.error("[Billing Debug] Request failed with error:", error);
    console.error("[Billing Debug] Error Name:", error.name);
    console.error("[Billing Debug] Error Message:", error.message);
    
    // Log all enumerable keys to see what's hidden
    try {
      console.error("[Billing Debug] Error Keys:", Object.keys(error));
      console.error("[Billing Debug] Error Stringified:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch (e) {
      console.error("[Billing Debug] Could not stringify error:", e);
    }

    if (error.errorData) {
      console.error("[Billing Debug] Error Data:", JSON.stringify(error.errorData, null, 2));
      return json({ error: "Billing Error", details: error.errorData }, { status: 400 });
    }
    
    return json({ 
      error: error.message || "An unexpected error occurred", 
      details: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        keys: Object.keys(error)
      } 
    }, { status: 500 });
  }
  
  return null;
}

const premiumStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :root {
    --loom-primary: #000000;
    --loom-bg: #ffffff;
    --loom-border: #e1e3e5;
    --loom-subdued: #6d7175;
    --loom-shadow-sm: 0 2px 4px rgba(0,0,0,0.05);
    --loom-shadow-md: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
    --loom-shadow-lg: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
  }

  .pricing-container {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  }

  .minimal-usage-card {
    background: #ffffff;
    border: 1px solid var(--loom-border);
    border-radius: 16px;
    box-shadow: var(--loom-shadow-sm);
  }

  .minimal-plan-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid var(--loom-border);
    border-radius: 20px;
    background: #ffffff;
    position: relative;
    /* overflow: hidden removed to prevent clipping */
  }

  .minimal-plan-card:hover {
    transform: translateY(-8px);
    border-color: #000000;
    box-shadow: var(--loom-shadow-lg);
  }

  .highlight-pro {
    border: 2px solid #000000 !important;
    transform: scale(1.02);
    z-index: 10;
    box-shadow: var(--loom-shadow-md);
  }

  .highlight-pro:hover {
     transform: scale(1.02) translateY(-8px);
  }

  .plan-badge-exclusive {
    background: #000000;
    color: white;
    padding: 6px 14px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    position: absolute;
    top: -12px;
    right: 20px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    z-index: 20;
  }

  .toggle-container-premium {
    background: #f4f4f5;
    padding: 6px;
    border-radius: 14px;
    display: inline-flex;
    gap: 2px;
    border: 1px solid #e4e4e7;
  }

  .toggle-btn-premium {
    padding: 10px 24px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: inherit;
  }

  .toggle-btn-premium.active {
    background: #ffffff;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    color: #000000;
  }

  .toggle-btn-premium.inactive {
    background: transparent;
    color: #71717a;
  }

  .toggle-btn-premium.inactive:hover {
    color: #18181b;
  }

  .feature-icon-wrapper {
    background: #f4f4f5;
    border-radius: 50%;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .premium-button-growth {
    background: linear-gradient(135deg, #000000 0%, #333333 100%) !important;
    border: none !important;
    color: white !important;
  }
  
  .premium-button-growth:hover {
    background: linear-gradient(135deg, #222222 0%, #444444 100%) !important;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
  }
`;

function UsageBar({ label, used, limit }) {
  const percent = limit === Infinity ? 0 : Math.min((used / limit) * 100, 100);
  const color = percent > 90 ? "#DC2626" : (percent > 70 ? "#F59E0B" : "#000000");
  
  return (
    <BlockStack gap="150">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text as="span" variant="bodyXs" fontWeight="semibold" tone="subdued">{label}</Text>
        <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
            <Text as="span" variant="bodySm" fontWeight="bold" tone={percent > 90 ? "critical" : undefined}>{used}</Text>
            <Text as="span" variant="bodyXs" tone="subdued">/ {limit === Infinity ? "∞" : limit}</Text>
        </div>
      </div>
      <div style={{ height: "6px", background: "#f1f1f5", borderRadius: "100px", overflow: "hidden" }}>
        <div style={{ 
          width: `${percent}%`, 
          height: "100%", 
          background: color, 
          borderRadius: "100px",
          transition: "width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)"
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
    <div className={`minimal-plan-card ${plan.highlighted ? 'highlight-pro' : ''}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {plan.badge && <div className="plan-badge-exclusive">{plan.badge}</div>}
      
      <Box padding="600" style={{ flexGrow: 1 }}>
        <BlockStack gap="600">
          <BlockStack gap="400">
            <BlockStack gap="100">
              <Text as="h3" variant="headingMd" fontWeight="bold">
                {plan.name}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued" fontWeight="medium">{plan.description}</Text>
            </BlockStack>
            
            <div style={{ display: "flex", gap: "4px", alignItems: "baseline", marginTop: "4px" }}>
              <span style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.02em" }}>{plan.price}</span>
              {plan.period && <Text as="span" variant="bodySm" tone="subdued" fontWeight="medium">{plan.period}</Text>}
            </div>
          </BlockStack>

          <Divider />

          <BlockStack gap="300">
            {plan.features.map((feature, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div className="feature-icon-wrapper">
                   <Icon source={CheckIcon} tone="base" size="extraSmall" />
                </div>
                <Text as="span" variant="bodySm" tone="subdued" fontWeight="medium">
                  {feature}
                </Text>
              </div>
            ))}
          </BlockStack>
        </BlockStack>
      </Box>

      <Box padding="600" paddingBlockStart="0">
        <BlockStack gap="300">
          {plan.trial && (
             <Text as="p" variant="bodyXs" alignment="center" tone="subdued" fontWeight="semibold">✨ {plan.trial}</Text>
          )}
          <Button
            variant={plan.highlighted ? "primary" : "secondary"}
            fullWidth
            disabled={isCurrent}
            onClick={handleSelect}
            size="large"
            className={plan.highlighted ? "premium-button-growth" : ""}
          >
            {isCurrent ? "Current Plan" : plan.buttonLabel}
          </Button>
        </BlockStack>
      </Box>
    </div>
  );
}

// ... PlanBenefits removed or updated if used ...

function CelebrationModal({ isOpen, onClose, planName }) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="🎉 You're Upgraded!"
      primaryAction={{
        content: "Create Your First Sale →",
        onAction: () => window.location.href = "/app/sales/new",
      }}
      secondaryActions={[
        {
          content: "Visit Help Center",
          onAction: () => window.location.href = "/app/help",
        }
      ]}
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
                  Thank you for choosing Loom!
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                  Your <Text as="span" fontWeight="bold">{planName} Plan</Text> is now active. You have unlocked all premium features to validy boost your sales.
                </Text>
              </BlockStack>
            </BlockStack>
          </Box>

          <Divider />

          <BlockStack gap="200" align="center">
             <Text as="p" variant="bodySm" tone="subdued" alignment="center">
               Need assistance? <Button variant="plain" url="mailto:Hello@adloomx.com">Hello@adloomx.com</Button>
             </Text>
          </BlockStack>
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
    const params = new URLSearchParams(location.search);
    if (celebrate || params.get('upgraded') === 'true') {
      setShowCelebrate(true);
      window.history.replaceState({}, "", location.pathname);
    }
  }, [celebrate, location.search, location.pathname]);

  const plans = [
    {
      name: "Free",
      id: "Free",
      price: "Free",
      period: "",
      features: [
        "Up to 50 variants",
        "1 Sale limit",
        "5 Active Coupons",
        "2 Countdown Timers",
        "Sale scheduling",
        "Advanced filtering",
        "Price rounding",
      ],
      description: "Perfect for starting out.",
      buttonLabel: "Free Plan",
      highlighted: false,
    },
    {
      name: "Basic",
      id: isYearly ? "Basic Annual" : "Basic",
      price: isYearly ? "$95.90" : "$9.99",
      period: isYearly ? "/yr" : "/mo",
      features: [
        "Up to 500 variants",
        "Unlimited Sales",
        "25 Active Coupons",
        "10 Countdown Timers",
        "Sale scheduling",
        "Early access features",
        "Fast support",
      ],
      description: "For growing stores.",
      trial: "7-day free trial",
      buttonLabel: "Choose Basic",
      highlighted: false,
    },
    {
      name: "Growth",
      id: isYearly ? "Growth Annual" : "Growth",
      price: isYearly ? "$191.90" : "$19.99",
      period: isYearly ? "/yr" : "/mo",
      badge: "Popular",
      features: [
        "Up to 1000 variants",
        "Unlimited Sales",
        "Unlimited Coupons",
        "Unlimited Timers",
        "Custom Timer Designs",
        "Priority Support",
        "Advanced Analytics",
      ],
      description: "For established brands.",
      trial: "7-day free trial",
      buttonLabel: "Choose Growth",
      highlighted: true,
    },
    {
      name: "Pro",
      id: isYearly ? "Pro Annual" : "Pro",
      price: isYearly ? "$287.90" : "$29.99",
      period: isYearly ? "/yr" : "/mo",
      features: [
        "Unlimited variants",
        "Unlimited Sales",
        "Unlimited Coupons",
        "Unlimited Timers",
        "Custom Offer Designs",
        "White-glove setup",
        "Priority Support",
      ],
      description: "For high-volume stores.",
      trial: "7-day free trial",
      buttonLabel: "Choose Pro",
      highlighted: false,
    },
  ];

  return (
    <Page title="" backAction={{ url: "/app" }}>
      <style>{premiumStyles}</style>
      <CelebrationModal isOpen={showCelebrate} onClose={() => setShowCelebrate(false)} planName={planName} />
      
      <div className="pricing-container">
        <BlockStack gap="1000">
          <Layout>
            {actionData?.error && (
              <Layout.Section>
                <Banner title={actionData.error} tone="critical" />
              </Layout.Section>
            )}

            <Layout.Section>
              <div className="minimal-usage-card">
                <Box padding="800">
                  <BlockStack gap="600">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingMd" fontWeight="bold">Account Overview</Text>
                      <Text as="p" variant="bodySm" tone="subdued" fontWeight="medium">
                        Current plan: <Text as="span" fontWeight="bold" tone="base">{currentPlan}</Text>
                      </Text>
                    </BlockStack>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "40px" }}>
                      <UsageBar label="Variant Limit" used={usage.variants?.used} limit={usage.variants?.limit} />
                      <UsageBar label="Sales Limit" used={usage.totalSales?.used} limit={usage.totalSales?.limit} />
                      <UsageBar label="Active Coupons" used={usage.coupons.used} limit={usage.coupons.limit} />
                      <UsageBar label="Active Timers" used={usage.timers.used} limit={usage.timers.limit} />
                    </div>
                  </BlockStack>
                </Box>
              </div>
            </Layout.Section>

            <Layout.Section>
              <BlockStack gap="1000">
                <BlockStack gap="400" align="center">
                  <Text as="h2" variant="headingXl" fontWeight="bold">Simple, transparent pricing</Text>
                  <Text as="p" variant="bodyLg" tone="subdued" alignment="center" fontWeight="medium">
                    Scale your store with the most powerful sales automation engine.
                  </Text>
                  
                  <Box paddingBlockStart="600">
                    <div className="toggle-container-premium">
                      <button 
                        className={`toggle-btn-premium ${!isYearly ? 'active' : 'inactive'}`} 
                        onClick={() => setIsYearly(false)}
                      >
                        Monthly
                      </button>
                      <button 
                        className={`toggle-btn-premium ${isYearly ? 'active' : 'inactive'}`} 
                        onClick={() => setIsYearly(true)}
                      >
                        Yearly <span style={{ color: "#10b981", marginLeft: "4px" }}>(Save 20%)</span>
                      </button>
                    </div>
                  </Box>
                </BlockStack>
    
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "30px", padding: "10px" }}>
                  {plans.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} currentPlan={currentPlan} />
                  ))}
                </div>
    
                <Box paddingBlockStart="400" paddingBlockEnd="1000" align="center">
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" tone="subdued" fontWeight="medium">
                      All payments are securely handled by Shopify.
                    </Text>
                    <InlineStack align="center" gap="100">
                       <Text as="span" variant="bodySm" tone="subdued">Need help choosing?</Text>
                       <Button variant="plain" url="mailto:hello@adloomx.com">Contact Specialist →</Button>
                    </InlineStack>
                  </BlockStack>
                </Box>
              </BlockStack>
            </Layout.Section>
          </Layout>
        </BlockStack>
      </div>
    </Page>
  );
}

