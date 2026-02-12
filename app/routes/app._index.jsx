import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit } from "@remix-run/react";
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
} from "@shopify/polaris";
import { SetupGuide } from "../components/SetupGuide";

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

  const resourceName = {
    singular: "sale",
    plural: "sales",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(sales);

  const rowMarkup = sales.map(
    ({ id, title, discountType, value, status, startTime, endTime }, index) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
      >
        <IndexTable.Cell>
          <Text fontWeight="bold" as="span">
            {title}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {discountType === "PERCENTAGE" ? `${value}%` : `$${value}`}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={status === "ACTIVE" ? "success" : status === "PENDING" ? "attention" : "base"}>
            {status}
          </Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {new Date(startTime).toLocaleString()}
        </IndexTable.Cell>
        <IndexTable.Cell>
          {new Date(endTime).toLocaleString()}
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
    <Page title="Sales Dashboard">
      <Layout>
        <Layout.Section>
          <SetupGuide salesCount={sales.length} />
          <Card padding="0">
            {sales.length === 0 ? (
                emptyStateMarkup
            ) : (
                <IndexTable
                  resourceName={resourceName}
                  itemCount={sales.length}
                  selectedItemsCount={
                    allResourcesSelected ? "All" : selectedResources.length
                  }
                  onSelectionChange={handleSelectionChange}
                  headings={[
                    { title: "Title" },
                    { title: "Discount" },
                    { title: "Status" },
                    { title: "Start Time" },
                    { title: "End Time" },
                    { title: "Actions" },
                  ]}
                >
                  {rowMarkup}
                </IndexTable>
            )}
          </Card>
          {sales.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                 <Button primary onClick={() => navigate("/app/sales/new")}>Create New Sale</Button>
              </div>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
