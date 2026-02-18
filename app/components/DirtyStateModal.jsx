import { Modal, Text, BlockStack } from "@shopify/polaris";
import { useBlocker } from "@remix-run/react";
import { useState, useEffect } from "react";

export function DirtyStateModal({ isDirty }) {
  // 1. Remix Blocker for internal navigation
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // 2. Browser 'beforeunload' for refresh/close tab
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // If the blocker is "blocked", it means the user tried to navigate away.
  // We show our custom modal.
  const isBlocked = blocker.state === "blocked";

  const handleProceed = () => {
    if (blocker.proceed) {
      blocker.proceed();
    }
  };

  const handleCancel = () => {
    if (blocker.reset) {
      blocker.reset();
    }
  };

  return (
    <Modal
      open={isBlocked}
      onClose={handleCancel}
      title="Unsaved changes"
      primaryAction={{
        content: "Discard changes",
        destructive: true,
        onAction: handleProceed,
      }}
      secondaryActions={[
        {
          content: "Keep editing",
          onAction: handleCancel,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Text as="p" variant="bodyMd">
            You have unsaved changes. If you leave this page, your changes will be lost.
          </Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
