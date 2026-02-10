import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import { useActionData, useSubmit, useNavigation } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { createSale, applySale } from "../models/sale.server";
import {
  Page,
  Layout,
  Card,
  TextField,
  Select,
  Button,
  BlockStack,
  Banner,
  List,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";

export async function loader({ request }) {
  await authenticate.admin(request);
  return null;
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const title = formData.get("title");
  const discountType = formData.get("discountType");
  const value = formData.get("value");
  const startTime = formData.get("startTime");
  const endTime = formData.get("endTime");
  const itemsString = formData.get("items");

  const items = JSON.parse(itemsString);

  const errors = {};
  if (!title) errors.title = "Title is required";
  if (!value) errors.value = "Value is required";
  if (!startTime) errors.startTime = "Start time is required";
  if (!endTime) errors.endTime = "End time is required";
  if (!items || items.length === 0) errors.items = "Select at least one product";

  if (Object.keys(errors).length > 0) {
    return json({ errors });
  }

  const sale = await createSale({
    title,
    discountType,
    value,
    startTime,
    endTime,
    items,
  });

  const now = new Date();
  const start = new Date(startTime);
  if (start <= now) {
    await applySale(sale.id, admin);
  }

  return redirect("/app");
}

export default function NewSale() {
  const shopify = useAppBridge();
  const [selectedItems, setSelectedItems] = useState([]);
  const [title, setTitle] = useState("");
  const [discountType, setDiscountType] = useState("PERCENTAGE");
  const [value, setValue] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const submit = useSubmit();
  const actionData = useActionData();
  const navigation = useNavigation();

  const isLoading = navigation.state === "submitting";

  const selectProducts = async () => {
    const response = await shopify.resourcePicker({
      type: "product",
      multiple: true,
    });

    if (response) {
      const variants = [];
      response.forEach((product) => {
        product.variants.forEach((variant) => {
          variants.push({
            productId: product.id,
            variantId: variant.id,
            productTitle: product.title,
            variantTitle: variant.title,
          });
        });
      });
      setSelectedItems(variants);
    }
  };

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("discountType", discountType);
    formData.append("value", value);
    formData.append("startTime", startTime);
    formData.append("endTime", endTime);
    formData.append("items", JSON.stringify(selectedItems));
    submit(formData, { method: "post" });
  };

  return (
    <Page title="Create New Sale" backAction={{ url: "/app" }}>
      <Layout>
        <Layout.Section>
            <Card>
              <BlockStack gap="400">
                {actionData?.errors && (
                  <Banner tone="critical">
                    <p>There were some errors with your submission</p>
                  </Banner>
                )}

                <TextField
                  label="Sale Name"
                  value={title}
                  onChange={setTitle}
                  autoComplete="off"
                  error={actionData?.errors?.title}
                />

                <Select
                  label="Discount Type"
                  options={[
                    { label: "Percentage", value: "PERCENTAGE" },
                    { label: "Fixed Amount", value: "FIXED_AMOUNT" },
                  ]}
                  value={discountType}
                  onChange={setDiscountType}
                />

                <TextField
                  label="Amount"
                  type="number"
                  value={value}
                  onChange={setValue}
                  autoComplete="off"
                  error={actionData?.errors?.value}
                />

                <TextField
                  label="Start Time"
                  type="datetime-local"
                  value={startTime}
                  onChange={setStartTime}
                  autoComplete="off"
                  error={actionData?.errors?.startTime}
                />

                <TextField
                  label="End Time"
                  type="datetime-local"
                  value={endTime}
                  onChange={setEndTime}
                  autoComplete="off"
                  error={actionData?.errors?.endTime}
                />

                <Button onClick={selectProducts}>
                  Select Products
                </Button>

                {selectedItems.length > 0 && (
                  <List type="bullet">
                    {selectedItems.map((item) => (
                      <List.Item key={item.variantId}>
                        {item.productTitle} - {item.variantTitle}
                      </List.Item>
                    ))}
                  </List>
                )}
                {actionData?.errors?.items && (
                  <div style={{ color: "red" }}>{actionData.errors.items}</div>
                )}

                <Button onClick={handleSubmit} primary loading={isLoading}>
                  Create Sale
                </Button>
              </BlockStack>
            </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
