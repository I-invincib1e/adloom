import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  useActionData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getCoupon, updateCoupon } from "../models/coupon.server";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Select,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Box,
  Banner,
  Thumbnail,
  Badge,
} from "@shopify/polaris";

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);
  const coupon = await getCoupon(params.id);
  if (!coupon) throw new Response("Not Found", { status: 404 });

  // Fetch product titles from Shopify
  const enrichedProducts = [];
  for (const p of coupon.products) {
    try {
      const response = await admin.graphql(
        `query getProduct($id: ID!) { product(id: $id) { id title featuredImage { url } } }`,
        { variables: { id: p.productId } }
      );
      const data = await response.json();
      if (data.data?.product) {
        enrichedProducts.push({
          productId: p.productId,
          productTitle: data.data.product.title,
          image: data.data.product.featuredImage?.url || null,
        });
      }
    } catch {
      enrichedProducts.push({
        productId: p.productId,
        productTitle: "Unknown product",
        image: null,
      });
    }
  }

  return json({ coupon: { ...coupon, enrichedProducts } });
}

export async function action({ request, params }) {
  await authenticate.admin(request);
  const formData = await request.formData();

  const offerTitle = formData.get("offerTitle");
  const couponCode = formData.get("couponCode");
  const description = formData.get("description");
  const startTime = formData.get("startTime");
  const endTime = formData.get("endTime");
  const style = formData.get("style");
  const productsStr = formData.get("products");

  const errors = {};
  if (!offerTitle) errors.offerTitle = "Offer title is required";
  if (!couponCode) errors.couponCode = "Coupon code is required";
  if (!startTime) errors.startTime = "Start time is required";
  if (!endTime) errors.endTime = "End time is required";

  if (Object.keys(errors).length > 0) {
    return json({ errors });
  }

  const products = JSON.parse(productsStr || "[]");

  await updateCoupon(params.id, {
    offerTitle,
    couponCode: couponCode.toUpperCase(),
    description,
    startTime,
    endTime,
    style,
    products,
  });

  return json({ success: true, message: "Coupon updated successfully." });
}

export default function EditCouponPage() {
  const { coupon } = useLoaderData();
  const shopify = useAppBridge();
  const submit = useSubmit();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  const [offerTitle, setOfferTitle] = useState(coupon.offerTitle);
  const [couponCode, setCouponCode] = useState(coupon.couponCode);
  const [description, setDescription] = useState(coupon.description || "");

  const startDT = new Date(coupon.startTime);
  const endDT = new Date(coupon.endTime);
  const [startDate, setStartDate] = useState(
    startDT.toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState(
    startDT.toTimeString().slice(0, 5)
  );
  const [endDate, setEndDate] = useState(endDT.toISOString().split("T")[0]);
  const [endTime, setEndTime] = useState(endDT.toTimeString().slice(0, 5));
  const [style, setStyle] = useState(coupon.style || "standard");

  const [selectedProducts, setSelectedProducts] = useState(
    coupon.enrichedProducts || []
  );

  const selectProducts = async () => {
    const response = await shopify.resourcePicker({
      type: "product",
      multiple: true,
    });

    if (response) {
      const products = response.map((product) => ({
        productId: product.id,
        productTitle: product.title,
        image: product.images[0]?.originalSrc || null,
      }));
      setSelectedProducts(products);
    }
  };

  const handleSubmit = () => {
    const startDateTime = `${startDate}T${startTime}:00`;
    const endDateTime = `${endDate}T${endTime}:00`;

    const formData = new FormData();
    formData.append("offerTitle", offerTitle);
    formData.append("couponCode", couponCode);
    formData.append("description", description);
    formData.append("startTime", startDateTime);
    formData.append("endTime", endDateTime);
    formData.append("style", style);
    formData.append("products", JSON.stringify(selectedProducts));

    submit(formData, { method: "post" });
  };

  return (
    <Page title="Edit Coupon" backAction={{ url: "/app/coupons" }}>
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {actionData?.success && (
              <Banner tone="success" title={actionData.message} />
            )}

            {actionData?.errors && (
              <Banner tone="critical">
                <ul>
                  {Object.values(actionData.errors).map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </Banner>
            )}

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingSm">
                  Offer details
                </Text>
                <TextField
                  label="Offer title"
                  value={offerTitle}
                  onChange={setOfferTitle}
                  autoComplete="off"
                  placeholder="e.g. Buy 1 Get 1 Free"
                  helpText="This message is shown to customers on the product page."
                  error={actionData?.errors?.offerTitle}
                />
                <TextField
                  label="Coupon code"
                  value={couponCode}
                  onChange={setCouponCode}
                  autoComplete="off"
                  placeholder="e.g. BYG1"
                  helpText="Customers will copy this code at checkout. Auto-uppercased."
                  error={actionData?.errors?.couponCode}
                  monospaced
                />
                <TextField
                  label="Description (optional)"
                  value={description}
                  onChange={setDescription}
                  autoComplete="off"
                  placeholder="Additional details about this offer"
                  multiline={2}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingSm">
                  Schedule
                </Text>
                <InlineStack gap="400">
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Start date"
                      type="date"
                      value={startDate}
                      onChange={setStartDate}
                      autoComplete="off"
                      error={actionData?.errors?.startTime}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Start time"
                      type="time"
                      value={startTime}
                      onChange={setStartTime}
                      autoComplete="off"
                    />
                  </div>
                </InlineStack>
                <InlineStack gap="400">
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="End date"
                      type="date"
                      value={endDate}
                      onChange={setEndDate}
                      autoComplete="off"
                      error={actionData?.errors?.endTime}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="End time"
                      type="time"
                      value={endTime}
                      onChange={setEndTime}
                      autoComplete="off"
                    />
                  </div>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingSm">
                  Appearance
                </Text>
                <Select
                  label="Coupon Style"
                  options={[
                    { label: "Standard (Solid)", value: "standard" },
                    { label: "Dotted Border", value: "dotted" },
                    { label: "Ticket Stub", value: "ticket" },
                    { label: "Minimal (Text only)", value: "minimal" },
                  ]}
                  value={style}
                  onChange={setStyle}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingSm">
                  Products
                </Text>
                <Text as="p" tone="subdued">
                  Select which products this coupon should be displayed on.
                </Text>
                <Button onClick={selectProducts}>Browse products</Button>

                {selectedProducts.length > 0 && (
                  <BlockStack gap="200">
                    <Box
                      padding="200"
                      background="bg-surface-secondary"
                      borderRadius="200"
                    >
                      <InlineStack align="space-between">
                        <Text variant="bodySm" fontWeight="semibold">
                          {selectedProducts.length} products selected
                        </Text>
                        <Button
                          variant="plain"
                          onClick={() => setSelectedProducts([])}
                        >
                          Remove all
                        </Button>
                      </InlineStack>
                    </Box>
                    {selectedProducts.map((p, idx) => (
                      <Box
                        key={p.productId || idx}
                        padding="200"
                        background="bg-surface-secondary"
                        borderRadius="200"
                      >
                        <InlineStack
                          gap="300"
                          blockAlign="center"
                          wrap={false}
                        >
                          <Thumbnail
                            source={
                              p.image ||
                              "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_small.png"
                            }
                            alt={p.productTitle}
                            size="small"
                          />
                          <Text as="span" fontWeight="semibold" variant="bodySm">
                            {p.productTitle}
                          </Text>
                        </InlineStack>
                      </Box>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingSm">
                Preview
              </Text>
              <Box
                padding="400"
                background="bg-surface-secondary"
                borderRadius="200"
              >
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <Text as="span" fontWeight="bold" variant="bodySm">
                        🎁 {offerTitle || "Your offer title"}
                      </Text>
                      {description && (
                        <Text as="span" variant="bodySm" tone="subdued">
                          {description}
                        </Text>
                      )}
                    </BlockStack>
                    <InlineStack gap="200">
                      <div
                        style={{
                          background: "#f3f3f3",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontFamily: "monospace",
                          fontSize: "13px",
                          fontWeight: "bold",
                          letterSpacing: "1px",
                        }}
                      >
                        {couponCode || "CODE"}
                      </div>
                      <Button size="micro">Copy</Button>
                    </InlineStack>
                  </InlineStack>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>

          <div style={{ marginTop: "16px" }}>
            <Button
              variant="primary"
              size="large"
              onClick={handleSubmit}
              loading={isLoading}
              fullWidth
            >
              Save Coupon
            </Button>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
