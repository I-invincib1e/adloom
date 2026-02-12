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
import { ChevronDownIcon, ChevronUpIcon, XIcon, CheckIcon } from "@shopify/polaris-icons";

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
    setTimeout(() => handleDismiss(), 1500);
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
              Follow these steps to start using the Rockit Sales Manager.
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
            title="How Rockit works"
            isOpen={openStep === 1}
            isCompleted={true} 
            onToggle={() => handleToggle(1)}
          >
             <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  <Text as="span" fontWeight="bold">Rockit edits prices in bulk.</Text> On activation it writes your discounted price and sets the previous price as compare-at price.
                </Text>
                <Text as="p" variant="bodyMd">
                  <Text as="span" fontWeight="bold">What you see on the store:</Text> Your theme shows crossed-out price and sale badge. The app does not change your theme's design. To show discounted prices in cart, a small theme edit is usually required. We can help.
                </Text>
                <Text as="p" variant="bodyMd">
                  <Text as="span" fontWeight="bold">If you make changes in your store:</Text> such as adding new products, editing collections, or updating prices — click Reactivate so Rockit can resync your active sale and update included products based on your sale criteria.
                </Text>
                 <Text as="p" variant="bodyMd">
                  <Text as="span" fontWeight="bold">Please note:</Text> If your store uses another app or inventory system that updates product prices, it may override Rockit's changes. We recommend temporarily disabling such apps during the sale.
                </Text>
                <InlineStack gap="200">
                    <Button>Read FAQ</Button>
                    <Button variant="plain" onClick={() => setOpenStep(2)}>I am all set</Button>
                </InlineStack>
             </BlockStack>
          </StepItem>

          {/* Step 2 */}
          <StepItem
            stepNumber={2}
            title="Create your first sale"
            isOpen={openStep === 2}
            isCompleted={step2Completed}
            onToggle={() => handleToggle(2)}
          >
             <Text as="p" variant="bodyMd">
                 Click the "Create New Sale" button below to get started.
             </Text>
          </StepItem>

          {/* Step 3 */}
          <StepItem
            stepNumber={3}
            title="Confirm the sale's working properly"
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
      </BlockStack>
    </Card>
  );
}

function StepItem({ stepNumber, title, isOpen, isCompleted, onToggle, children }) {
  return (
    <div style={{ borderBottom: "1px solid var(--p-color-border-subdued)", padding: "12px 0" }}>
      <div
        onClick={onToggle}
        style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
      >
        <div style={{ marginRight: "8px" }}>
            {isCompleted ? (
                 <Icon source={CheckIcon} tone="success" />
            ) : (
                <div style={{
                    width: "20px", height: "20px", borderRadius: "50%", border: "2px solid #ccc",
                    borderStyle: "dashed", display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                </div>
            )}
        </div>
        <Text as="h3" variant="bodyMd" fontWeight="semibold">
          {title}
        </Text>
         <div style={{ marginLeft: "auto" }}>
             <Icon source={isOpen ? ChevronUpIcon : ChevronDownIcon} tone="subdued" />
         </div>
      </div>
      <Collapsible open={isOpen} id={`step-${stepNumber}-collapsible`}>
        <Box paddingBlockStart="300" paddingInlineStart="800">
          {children}
        </Box>
      </Collapsible>
    </div>
  );
}
