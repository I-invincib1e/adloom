import {
  Box,
  Card,
  Text,
  BlockStack,
  Button,
  InlineStack,
  ProgressBar,
  Collapsible,
  Icon,
} from "@shopify/polaris";
import { useState, useEffect } from "react";
import { ChevronDownIcon, ChevronUpIcon, XIcon, CheckIcon, ChatIcon } from "@shopify/polaris-icons";

export function SetupGuide({ onDismiss, salesCount }) {
  const [openStep, setOpenStep] = useState(1);
  const [dismissed, setDismissed] = useState(true); // default hidden, will check localStorage
  const [step3Checked, setStep3Checked] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("setupGuideDismissed");
      const storedStep3 = localStorage.getItem("setupGuideStep3");
      if (storedStep3 === "true") setStep3Checked(true);
      setDismissed(stored === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    try { localStorage.setItem("setupGuideDismissed", "true"); } catch {}
    if (onDismiss) onDismiss();
    setDismissed(true);
  };

  const handleStep3Check = () => {
    setStep3Checked(true);
    try { localStorage.setItem("setupGuideStep3", "true"); } catch {}
  };

  if (dismissed) return null;

  const handleToggle = (step) => {
    setOpenStep(openStep === step ? null : step);
  };

  const step2Completed = salesCount > 0;
  const completedSteps = 1 + (step2Completed ? 1 : 0) + (step3Checked ? 1 : 0); 
  const progress = (completedSteps / 3) * 100;

  // Auto-dismiss when all steps are done
  if (completedSteps === 3 && !dismissed) {
    setTimeout(() => handleDismiss(), 3000); // Increased time to see success state
  }

  return (
    <Card padding="200">
      <BlockStack gap="200">
        <InlineStack align="space-between">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd" fontWeight="semibold">
              Setup guide
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Follow these steps to start using the Loom - Offer & Sales.
            </Text>
            <Text as="p" variant="bodySm">
              {completedSteps} / 3 steps completed
            </Text>
          </BlockStack>
          <Button
            variant="plain"
            icon={XIcon}
            onClick={handleDismiss}
            accessibilityLabel="Dismiss setup guide"
          />
        </InlineStack>

        <ProgressBar progress={progress} size="small" tone="primary" />

        <BlockStack gap="0">
          {/* Step 1 */}
          <StepItem
            stepNumber={1}
            title="Create your first Sale"
            subtitle="Select products, set discount, activate in 2 minutes."
            isOpen={openStep === 1}
            isCompleted={true} 
            onToggle={() => handleToggle(1)}
          >
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  <Text as="span" fontWeight="bold">Loom edits prices in bulk.</Text> On activation it writes your discounted price and sets the previous price as compare-at price.
                </Text>
                <Text as="p" variant="bodyMd">
                  <Text as="span" fontWeight="bold">What you see on the store:</Text> Your theme shows crossed-out price and sale badge.
                </Text>
                <InlineStack gap="200">
                    <Button>Read FAQ</Button>
                    <Button variant="plain" onClick={() => setOpenStep(2)}>Next Step</Button>
                </InlineStack>
             </BlockStack>
          </StepItem>

          {/* Step 2 */}
          <StepItem
            stepNumber={2}
            title="Add Timer to Store"
            subtitle="Add urgency with a countdown timer to boost conversions."
            isOpen={openStep === 2}
            isCompleted={step2Completed}
            onToggle={() => handleToggle(2)}
          >
             <BlockStack gap="200">
                 <Text as="p" variant="bodyMd">
                     Click the "Create New Sale" button below to get started.
                 </Text>
                 <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                     <Text as="p" variant="bodySm" tone="subdued">
                         <Text as="span" fontWeight="bold">Note:</Text> Use App Block for OS 2.0 themes. For Legacy themes, use manual install snippet.
                     </Text>
                 </Box>
             </BlockStack>
          </StepItem>

          {/* Step 3 */}
          <StepItem
            stepNumber={3}
            title="Launch a Coupon"
            subtitle="Encourage action with limited-time coupon codes."
            isOpen={openStep === 3}
            isCompleted={step3Checked}
            onToggle={() => handleToggle(3)}
          >
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd">
                Check your storefront to verify the discounted prices and badges are showing correctly.
              </Text>
               <Button onClick={handleStep3Check}>Mark as checked</Button>
            </BlockStack>
          </StepItem>
        </BlockStack>

        <Box paddingBlockStart="200">
             <InlineStack align="center">
                <Button
                  url="mailto:Hello@adloomx.com?subject=Loom%20Setup%20Feedback"
                  variant="plain"
                  icon={ChatIcon}
                  size="slim"
                >
                  Give Feedback
                </Button>
            </InlineStack>
        </Box>
      </BlockStack>
    </Card>
  );
}

function StepItem({ stepNumber, title, subtitle, isOpen, isCompleted, onToggle, children }) {
  return (
    <div style={{ borderBottom: "1px solid var(--p-color-border-subdued)", padding: "12px 0" }}>
      <div
        onClick={onToggle}
        style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}
      >
        <div style={{ flexShrink: 0 }}>
            {isCompleted ? (
                 <div style={{ animation: "fadeIn 0.5s ease-out" }}>
                    <Icon source={CheckIcon} tone="success" />
                 </div>
            ) : (
                <div style={{
                    width: "20px", height: "20px", borderRadius: "50%", border: "2px solid #ccc",
                    borderStyle: "dashed", display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                </div>
            )}
        </div>
        <BlockStack gap="0">
            <Text as="h3" variant="bodyMd" fontWeight="semibold">
              {title}
            </Text>
            {subtitle && (
                <Text as="p" variant="bodySm" tone="subdued">
                    {subtitle}
                </Text>
            )}
        </BlockStack>
         <div style={{ marginLeft: "auto" }}>
             <Icon source={isOpen ? ChevronUpIcon : ChevronDownIcon} tone="subdued" />
         </div>
      </div>
      <Collapsible open={isOpen} id={`step-${stepNumber}-collapsible`}>
        <Box paddingBlockStart="300" paddingInlineStart="800">
          {children}
        </Box>
      </Collapsible>
      <style>
          {`
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.8); }
                to { opacity: 1; transform: scale(1); }
            }
          `}
      </style>
    </div>
  );
}
