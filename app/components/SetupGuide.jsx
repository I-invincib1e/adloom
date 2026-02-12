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
import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, XIcon, CheckIcon } from "@shopify/polaris-icons";

export function SetupGuide({ onDismiss, salesCount }) {
  const [openStep, setOpenStep] = useState(1);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleToggle = (step) => {
    setOpenStep(openStep === step ? null : step);
  };

  // Determine completion based on logic (salesCount > 0 for step 2)
  const step2Completed = salesCount > 0;
  // Step 1 is "How Rockit works" - treat as complete once viewed/interacted or just static 1/3?
  // The user prompt says "1 / 3 steps completed". Let's assume Step 1 is read/done.
  const completedSteps = 1 + (step2Completed ? 1 : 0); 
  const progress = (completedSteps / 3) * 100;

  return (
    <Card padding="400">
      <BlockStack gap="400">
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
            onClick={() => {
                if(onDismiss) onDismiss();
                setDismissed(true);
            }}
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
            isCompleted={false}
            onToggle={() => handleToggle(3)}
          >
            <Text as="p" variant="bodyMd">
              Check your storefront to verify the discounted prices and badges are showing correctly.
            </Text>
             <Button onClick={() => {}}>Mark as checked</Button>
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
