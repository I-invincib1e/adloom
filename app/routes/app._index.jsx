import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit, useSearchParams, Link } from "@remix-run/react";
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
} from "@shopify/polaris";
import { SetupGuide } from "../components/SetupGuide";
import { useState, useCallback } from "react";

export async function loader({ request }) {
  await authenticate.admin(request);
  const sales = await getSales();
  return json({ sales });
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");
  const saleId = formData.get("saleId");

  if (action === "revert" && saleId) {
    await revertSale(saleId, admin);
  } else if (action === "delete" && saleId) {
    await deleteSale(saleId, admin);
  }

  return json({ success: true });
}

export default function Index() {
  const { sales } = useLoaderData();
  const navigate = useNavigate();
  const submit = useSubmit();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTab, setSelectedTab] = useState(0);

  const showSuccessBanner = searchParams.get("success") === "true";
  const updatedCount = searchParams.get("count");

  const dismissBanner = useCallback(() => {
    setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.delete("success");
        newParams.delete("count");
        return newParams;
    });
  }, [setSearchParams]);

  const tabs = [
    { id: "all-sales", content: "All", accessibilityLabel: "All sales" },
    { id: "active-sales", content: "Active", accessibilityLabel: "Active sales" },
    { id: "scheduled-sales", content: "Scheduled", accessibilityLabel: "Scheduled sales" },
    { id: "expired-sales", content: "Expired", accessibilityLabel: "Expired sales" },
  ];

  const handleTabChange = useCallback(
    (selectedTabIndex) => setSelectedTab(selectedTabIndex),
    []
  );

  const filteredSales = sales.filter((sale) => {
    switch (selectedTab) {
      case 1: // Active
        return sale.status === "ACTIVE";
      case 2: // Scheduled
        return sale.status === "PENDING"; // Assuming PENDING is Scheduled
      case 3: // Expired
        return sale.status === "COMPLETED"; // Assuming COMPLETED is Expired
      default:
        return true;
    }
  });

  const resourceName = {
    singular: "sale",
    plural: "sales",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(filteredSales);

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
          <div onClick={(e) => e.stopPropagation()} style={{ display: "inline" }}>
            <Link to={`/app/sales/${id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <Text fontWeight="bold" as="span">
                {title}
              </Text>
            </Link>
          </div>
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
          {formatDate(startTime)}
        </IndexTable.Cell>
        <IndexTable.Cell>
          {formatDate(endTime)}
        </IndexTable.Cell>
        <IndexTable.Cell>
           <Text as="span" alignment="end">{_count?.items || 0}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
            {status === "ACTIVE" && (
                <Button size="micro" tone="critical" onClick={() => submit({ action: "revert", saleId: id }, { method: "post" })}>
                    Revert
                </Button>
            )}
             <div style={{ marginLeft: "0.5rem", display: "inline-block" }}>
              <Button size="micro" tone="critical" variant="plain" onClick={() => submit({ action: "delete", saleId: id }, { method: "post" })}>
                  Delete
              </Button>
            </div>
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

  return (
    <Page title="Sales">
      <Layout>
        <Layout.Section>
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
           {sales.length > 0 && (
              <div style={{ marginTop: "1rem", marginBottom: "2rem" }}>
                 <Button variant="primary" onClick={() => navigate("/app/sales/new")}>Create sale</Button>
              </div>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
