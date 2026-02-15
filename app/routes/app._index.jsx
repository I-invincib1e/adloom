import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit, useSearchParams, useNavigation, useRouteError, isRouteErrorResponse, useActionData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getSales, revertSale, deleteSale } from "../models/sale.server";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Badge,
  Button,
  useIndexResourceState,
  Text,
  EmptyState,
  Tabs,
  Banner,
  InlineStack,
  Modal,
  BlockStack,
  Tooltip,
  Spinner,
} from "@shopify/polaris";
import { SetupGuide } from "../components/SetupGuide";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

// Relative time helper
function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const future = diffMs < 0;
  const absDiff = Math.abs(diffMs);
  const mins = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  if (future) {
    if (mins < 60) return `in ${mins}m`;
    if (hours < 24) return `in ${hours}h`;
    if (days < 30) return `in ${days}d`;
    return `in ${Math.floor(days / 30)}mo`;
  }
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export async function loader({ request }) {
  await authenticate.admin(request);
  try {
    const sales = await getSales();
    return json({ sales });
  } catch (error) {
    console.error("Loader failed:", error);
    throw new Response("Failed to load sales", { status: 500 });
  }
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");
  const saleId = formData.get("saleId");

  try {
    if (action === "revert" && saleId) {
      await revertSale(saleId, admin);
    } else if (action === "delete" && saleId) {
      await deleteSale(saleId, admin);
    } else if (action === "bulkDeactivate") {
      const ids = formData.get("ids")?.split(",") || [];
      for (const id of ids) {
        await revertSale(id, admin);
      }
    } else if (action === "bulkDelete") {
      const ids = formData.get("ids")?.split(",") || [];
      for (const id of ids) {
        await deleteSale(id, admin);
      }
    }
    return json({ success: true });
  } catch (error) {
    console.error("Action failed:", error);
    return json({ success: false, error: error.message || "An unexpected error occurred" }, { status: 500 });
  }
}

export default function Index() {
  const { sales } = useLoaderData();
  const actionData = useActionData();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting" || navigation.state === "loading";
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTab, setSelectedTab] = useState(0);
  const shopify = useAppBridge();

  // Confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type, ids, label }

  // App embed prompt — shown once until dismissed
  const [showEmbedBanner, setShowEmbedBanner] = useState(false);
  useEffect(() => {
    const dismissed = localStorage.getItem("rockit_embed_dismissed");
    if (!dismissed) setShowEmbedBanner(true);
  }, []);

  const dismissEmbed = useCallback(() => {
    localStorage.setItem("rockit_embed_dismissed", "true");
    setShowEmbedBanner(false);
  }, []);

  const showSuccessBanner = searchParams.get("success") === "true";
  const updatedCount = searchParams.get("count");

  useEffect(() => {
    if (showSuccessBanner) {
      shopify.toast.show(`Sale activated — ${updatedCount} prices updated`);
    }
  }, [showSuccessBanner]);

  useEffect(() => {
    if (actionData?.error) {
      shopify.toast.show(actionData.error, { isError: true });
    }
  }, [actionData]);

  const dismissBanner = useCallback(() => {
    setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.delete("success");
        newParams.delete("count");
        return newParams;
    });
  }, [setSearchParams]);

  // Tab counts
  const counts = useMemo(() => ({
    all: sales.length,
    active: sales.filter(s => s.status === "ACTIVE").length,
    scheduled: sales.filter(s => s.status === "PENDING").length,
    expired: sales.filter(s => s.status === "COMPLETED").length,
  }), [sales]);

  const tabs = [
    { id: "all-sales", content: `All (${counts.all})`, accessibilityLabel: "All sales" },
    { id: "active-sales", content: `Active (${counts.active})`, accessibilityLabel: "Active sales" },
    { id: "scheduled-sales", content: `Scheduled (${counts.scheduled})`, accessibilityLabel: "Scheduled sales" },
    { id: "expired-sales", content: `Expired (${counts.expired})`, accessibilityLabel: "Expired sales" },
  ];

  const handleTabChange = useCallback(
    (selectedTabIndex) => setSelectedTab(selectedTabIndex),
    []
  );

  const filteredSales = sales.filter((sale) => {
    switch (selectedTab) {
      case 1: return sale.status === "ACTIVE";
      case 2: return sale.status === "PENDING";
      case 3: return sale.status === "COMPLETED";
      default: return true;
    }
  });

  const resourceName = { singular: "sale", plural: "sales" };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(filteredSales);

  // --- Confirmation helpers ---
  const requestConfirm = (type, ids, label) => {
    setConfirmAction({ type, ids, label });
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    const { type, ids } = confirmAction;

    if (type === "deactivate") {
      submit({ action: "revert", saleId: ids[0] }, { method: "post" });
    } else if (type === "delete") {
      submit({ action: "delete", saleId: ids[0] }, { method: "post" });
    } else if (type === "bulkDeactivate") {
      submit({ action: "bulkDeactivate", ids: ids.join(",") }, { method: "post" });
    } else if (type === "bulkDelete") {
      submit({ action: "bulkDelete", ids: ids.join(",") }, { method: "post" });
    }

    setConfirmOpen(false);
    setConfirmAction(null);
  };

  const handleCancelConfirm = () => {
    setConfirmOpen(false);
    setConfirmAction(null);
  };

  // --- Bulk actions ---
  const promotedBulkActions = [
    {
      content: "Deactivate selected",
      onAction: () => {
        const activeIds = selectedResources.filter(id =>
          sales.find(s => s.id === id && s.status === "ACTIVE")
        );
        if (activeIds.length === 0) {
          shopify.toast.show("No active sales selected", { isError: true });
          return;
        }
        requestConfirm(
          "bulkDeactivate",
          activeIds,
          `Deactivate ${activeIds.length} active sale${activeIds.length > 1 ? "s" : ""}?`
        );
      },
    },
    {
      content: "Delete selected",
      destructive: true,
      onAction: () => {
        requestConfirm(
          "bulkDelete",
          selectedResources,
          `Delete ${selectedResources.length} sale${selectedResources.length > 1 ? "s" : ""}? This cannot be undone.`
        );
      },
    },
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  };

  const rowMarkup = filteredSales.map(
    ({ id, title, discountType, value, status, startTime, endTime, _count }, index) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
      >
        <IndexTable.Cell>
          <Text fontWeight="bold" as="span">{title}</Text>
          <div style={{ fontSize: "12px", color: "#6d7175" }}>
             {discountType === "PERCENTAGE" ? `${value}% off` : `$${value} off`}
          </div>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={status === "ACTIVE" ? "success" : status === "PENDING" ? "attention" : "warning"}>
            {status === "PENDING" ? "Scheduled" : status === "COMPLETED" ? "Expired" : "Active"}
          </Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Tooltip content={formatDate(startTime)}>
            <Text as="span" tone="subdued">{timeAgo(startTime)}</Text>
          </Tooltip>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Tooltip content={formatDate(endTime)}>
            <Text as="span" tone="subdued">{timeAgo(endTime)}</Text>
          </Tooltip>
        </IndexTable.Cell>
        <IndexTable.Cell>
           <Text as="span" alignment="end">{_count?.items || 0}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <InlineStack gap="200">
            <Button size="micro" onClick={() => navigate(`/app/sales/${id}`)}>Edit</Button>
            {status === "ACTIVE" && (
                <Button
                  size="micro"
                  tone="critical"
                  disabled={isSubmitting}
                  onClick={() => requestConfirm("deactivate", [id], `Deactivate sale "${title}"?`)}
                >
                    Deactivate
                </Button>
            )}
            <Button
              size="micro"
              tone="critical"
              variant="plain"
              disabled={isSubmitting}
              onClick={() => requestConfirm("delete", [id], `Delete sale "${title}"? This cannot be undone.`)}
            >
                Delete
            </Button>
          </InlineStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    )
  );

  const emptyStateMarkup = (
    <EmptyState
      heading="Create your first sale"
      action={{
        content: "Create New Sale",
        onAction: () => navigate("/app/sales/new"),
      }}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>Track and manage your sales easily.</p>
    </EmptyState>
  );

  // Confirmation message based on action type
  const confirmTitle = confirmAction?.type?.includes("Delete") || confirmAction?.type === "delete" || confirmAction?.type === "bulkDelete"
    ? "Confirm delete"
    : "Confirm deactivate";

  return (
    <Page
      title="Sales"
      primaryAction={sales.length > 0 ? {
        content: "Create sale",
        onAction: () => navigate("/app/sales/new"),
      } : undefined}
    >
      <Layout>
        <Layout.Section>
          {showEmbedBanner && (
            <div style={{ marginBottom: "1rem" }}>
              <Banner
                tone="info"
                onDismiss={dismissEmbed}
                title="Embed app on your storefront"
              >
                <p>To display timers and sale features on your store, the app needs to be embedded in your theme.</p>
                <div style={{ marginTop: "0.5rem" }}>
                  <InlineStack gap="200">
                    <Button
                      url="https://admin.shopify.com/themes/current/editor?context=apps"
                      external
                      target="_top"
                    >
                      Embed app
                    </Button>
                    <Button onClick={dismissEmbed} variant="plain">Skip for now</Button>
                  </InlineStack>
                </div>
              </Banner>
            </div>
          )}
          {showSuccessBanner && (
             <div style={{ marginBottom: "1rem" }}>
                <Banner
                    tone="success"
                    onDismiss={dismissBanner}
                    title={`Sale has been activated, and ${updatedCount} prices have been updated.`}
                >
                    <p>Have the prices been updated correctly for the selected products?</p>
                    <div style={{ marginTop: "0.5rem" }}>
                         <InlineStack gap="200">
                            <Button onClick={dismissBanner}>Everything is great</Button>
                            <Button onClick={dismissBanner}>There is a problem</Button>
                         </InlineStack>
                    </div>
                </Banner>
             </div>
          )}
          <SetupGuide salesCount={sales.length} />
          <Card padding="0">
            {sales.length === 0 ? (
                emptyStateMarkup
            ) : (
                <>
                  <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
                  </Tabs>
                  <IndexTable
                    resourceName={resourceName}
                    itemCount={filteredSales.length}
                    selectedItemsCount={
                      allResourcesSelected ? "All" : selectedResources.length
                    }
                    onSelectionChange={handleSelectionChange}
                    promotedBulkActions={promotedBulkActions}
                    headings={[
                      { title: "Title" },
                      { title: "Status" },
                      { title: "Start time (EST)" },
                      { title: "End time (EST)" },
                      { title: "Variants on sale", alignment: "end" },
                      { title: "Actions" },
                    ]}
                  >
                    {rowMarkup}
                  </IndexTable>
                </>
            )}
          </Card>
        </Layout.Section>
      </Layout>

      {/* Confirmation Modal */}
      <Modal
        open={confirmOpen}
        onClose={handleCancelConfirm}
        title={confirmTitle}
        primaryAction={{
          content: confirmAction?.type?.includes("elete") ? "Delete" : "Deactivate",
          destructive: true,
          loading: isSubmitting,
          onAction: handleConfirm,
        }}
        secondaryActions={[
          { content: "Cancel", onAction: handleCancelConfirm, disabled: isSubmitting },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="200">
            <Text as="p">{confirmAction?.label}</Text>
            {isSubmitting && (
              <InlineStack gap="200" align="center">
                <Spinner size="small" />
                <Text as="span" tone="subdued">Processing…</Text>
              </InlineStack>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  return (
    <Page title="Error">
      <Layout>
        <Layout.Section>
          <Banner tone="critical" title="Something went wrong">
            <p>
              {isRouteErrorResponse(error)
                ? `${error.status} ${error.statusText} - ${error.data}`
                : error instanceof Error
                ? error.message
                : "Unknown error occurred"}
            </p>
            <div style={{ marginTop: "1rem" }}>
              <Button onClick={() => window.location.reload()}>Reload Page</Button>
            </div>
          </Banner>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
