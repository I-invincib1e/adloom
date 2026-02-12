import { useState, useCallback } from "react";
import { json, redirect } from "@remix-run/node";
import { useActionData, useSubmit, useNavigation } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { createSale, applySale } from "../models/sale.server"; // Ensure applySale is imported
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
  Checkbox,
  RadioButton,
  InlineStack,
  Text,
  Box,
  Collapsible,
  Icon,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { SearchIcon } from "@shopify/polaris-icons";

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

  // New fields
  const overrideCents = formData.get("overrideCents") === "true";
  const discountStrategy = formData.get("discountStrategy");
  const excludeDrafts = formData.get("excludeDrafts") === "true";
  const excludeOnSale = formData.get("excludeOnSale") === "true";
  const allowOverride = formData.get("allowOverride") === "true";
  const deactivationStrategy = formData.get("deactivationStrategy");
  const timerId = formData.get("timerId"); // Not fully implemented in UI yet, but handled
  const tagsToAdd = formData.get("tagsToAdd");
  const tagsToRemove = formData.get("tagsToRemove");

  const items = JSON.parse(itemsString);

  const errors = {};
  if (!title) errors.title = "Title is required";
  if (!value) errors.value = "Value is required";
  if (!startTime) errors.startTime = "Start time is required";
  // End time is optional in UI (checkbox), but model expects it. For now, require it or set far future?
  // User prompt shows "Set end date" checkbox. Let's assume if not set, it's open-ended?
  // Prisma model has endTime as DateTime (required). We'll fallback to a default if not set for now, or require it.
  // Given user screenshots show "Set end date" unchecked by default, we might need nullable in schema, but schema says DateTime.
  // I will require it for now to match current schema, or just set to 1 year from now if not provided.
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
    overrideCents,
    discountStrategy,
    excludeDrafts,
    excludeOnSale,
    allowOverride,
    deactivationStrategy,
    timerId,
    tagsToAdd,
    tagsToRemove,
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
  const [value, setValue] = useState("0");
  const [overrideCents, setOverrideCents] = useState(false);
  
  const [discountStrategy, setDiscountStrategy] = useState("COMPARE_AT");
  
  // Applies To
  const [appliesToType, setAppliesToType] = useState("products"); // products, collections
  const [excludeDrafts, setExcludeDrafts] = useState(true);
  const [excludeOnSale, setExcludeOnSale] = useState(false);
  const [excludeCertainProducts, setExcludeCertainProducts] = useState(false); // UI toggle only for now

  // Dates
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [endTime, setEndTime] = useState("23:59");
  const [setEndTimer, setSetEndTimer] = useState(true);

  // Activation / Deactivation
  const [allowOverride, setAllowOverride] = useState(false);
  const [deactivationStrategy, setDeactivationStrategy] = useState("RESTORE");

  // Timer & Tags
  const [timerDisplay, setTimerDisplay] = useState("no-timer");
  const [tagsToAdd, setTagsToAdd] = useState("");
  const [tagsToRemove, setTagsToRemove] = useState("");

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
    const startDateTime = `${startDate}T${startTime}:00`;
    const endDateTime = setEndTimer ? `${endDate}T${endTime}:00` : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const formData = new FormData();
    formData.append("title", title);
    formData.append("discountType", discountType);
    formData.append("value", value);
    formData.append("startTime", startDateTime);
    formData.append("endTime", endDateTime);
    formData.append("items", JSON.stringify(selectedItems));
    
    formData.append("overrideCents", overrideCents.toString());
    formData.append("discountStrategy", discountStrategy);
    formData.append("excludeDrafts", excludeDrafts.toString());
    formData.append("excludeOnSale", excludeOnSale.toString());
    formData.append("allowOverride", allowOverride.toString());
    formData.append("deactivationStrategy", deactivationStrategy);
    formData.append("tagsToAdd", tagsToAdd);
    formData.append("tagsToRemove", tagsToRemove);

    submit(formData, { method: "post" });
  };

  return (
    <Page
      title="Create price discount"
      backAction={{ url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {actionData?.errors && (
               <Banner tone="critical">
                 <p>There were some errors with your submission</p>
                  <ul>
                    {Object.values(actionData.errors).map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
               </Banner>
             )}

            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingSm">Title</Text>
                <TextField
                  label="Title"
                  labelHidden
                  value={title}
                  onChange={setTitle}
                  autoComplete="off"
                  maxLength={255}
                  showCharacterCount
                  helpText="This title is not visible to the clients."
                  error={actionData?.errors?.title}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                 <Text as="h2" variant="headingSm">Discount value</Text>
                 <InlineStack gap="400">
                    <div style={{ flex: 1 }}>
                        <Select
                            label="Discount type"
                            labelHidden
                            options={[
                              { label: "Percentage", value: "PERCENTAGE" },
                              { label: "Fixed Amount", value: "FIXED_AMOUNT" },
                            ]}
                            value={discountType}
                            onChange={setDiscountType}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <TextField
                            label="Value"
                            labelHidden
                            type="number"
                            value={value}
                            onChange={setValue}
                            suffix={discountType === "PERCENTAGE" ? "%" : ""}
                            autoComplete="off"
                            error={actionData?.errors?.value}
                        />
                    </div>
                 </InlineStack>
                 <Checkbox
                    label="Override cents"
                    checked={overrideCents}
                    onChange={setOverrideCents}
                 />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                 <InlineStack align="space-between">
                    <Text as="h2" variant="headingSm">Discount strategy</Text>
                     <Button variant="plain">Show example</Button>
                 </InlineStack>
                 
                 <BlockStack gap="200">
                    <RadioButton
                        label="Calculate discount based on compare-at price"
                        checked={discountStrategy === "COMPARE_AT"}
                        id="strategy-compare-at"
                        name="discountStrategy"
                        onChange={() => setDiscountStrategy("COMPARE_AT")}
                    />
                    <RadioButton
                        label="Discount current price but keep compare-at price unchanged"
                        checked={discountStrategy === "KEEP_COMPARE_AT"}
                        id="strategy-keep-compare-at"
                        name="discountStrategy"
                        onChange={() => setDiscountStrategy("KEEP_COMPARE_AT")}
                    />
                     <RadioButton
                        label="Use current price as compare-at price and discount it"
                        checked={discountStrategy === "USE_CURRENT_AS_COMPARE"}
                        id="strategy-use-current"
                        name="discountStrategy"
                        onChange={() => setDiscountStrategy("USE_CURRENT_AS_COMPARE")}
                    />
                     <RadioButton
                        label="Keep current price and increase compare-at price"
                        checked={discountStrategy === "INCREASE_COMPARE"}
                        id="strategy-increase-compare"
                        name="discountStrategy"
                        onChange={() => setDiscountStrategy("INCREASE_COMPARE")}
                    />
                 </BlockStack>
              </BlockStack>
            </Card>

            <Card>
                <BlockStack gap="400">
                    <Text as="h2" variant="headingSm">Applies to</Text>
                    <InlineStack gap="200">
                         <div style={{ flex: 1 }}>
                             <Select
                                options={[{ label: "Products / Variants", value: "products" }]}
                                value={appliesToType}
                                onChange={setAppliesToType}
                                label="Applies to"
                                labelHidden
                             />
                         </div>
                         <div style={{ flex: 2 }}>
                            <TextField
                                value={""}
                                placeholder="Search products"
                                autoComplete="off"
                                prefix={<Icon source={SearchIcon} />}
                                connectedRight={<Button onClick={selectProducts}>Browse</Button>}
                                label="Search"
                                labelHidden
                            />
                         </div>
                    </InlineStack>
                    
                     {selectedItems.length > 0 && (
                        <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                           <Text variant="bodySm">{selectedItems.length} variants selected</Text>
                        </Box>
                     )}

                    <BlockStack gap="200">
                        <Text as="h3" variant="bodyMd" fontWeight="semibold">Exclude</Text>
                         <Checkbox
                            label="Exclude draft products from sale"
                            checked={excludeDrafts}
                            onChange={setExcludeDrafts}
                         />
                         <Checkbox
                            label="Exclude product variants that are on sale (with a compare-at price set)"
                            checked={excludeOnSale}
                            onChange={setExcludeOnSale}
                         />
                         <Checkbox
                            label="Exclude certain products from sale"
                            checked={excludeCertainProducts}
                            onChange={setExcludeCertainProducts}
                         />
                    </BlockStack>
                </BlockStack>
            </Card>
            
            <Card>
                 <BlockStack gap="400">
                     <Text as="h2" variant="headingSm">Combinations</Text>
                     <Text as="p" tone="subdued">How to prevent combining <strong>discount codes</strong> with products on sale. <Button variant="plain">Show instructions</Button></Text>
                 </BlockStack>
            </Card>

            <Card>
                 <BlockStack gap="400">
                    <Text as="h2" variant="headingSm">Active dates</Text>
                    <InlineStack gap="400">
                        <div style={{ flex: 1 }}>
                            <TextField
                                label="Start date"
                                type="date"
                                value={startDate}
                                onChange={setStartDate}
                                autoComplete="off"
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
                    <Checkbox
                        label="Set end date"
                        checked={setEndTimer}
                        onChange={setSetEndTimer}
                    />
                    {setEndTimer && (
                         <InlineStack gap="400">
                            <div style={{ flex: 1 }}>
                                <TextField
                                    label="End date"
                                    type="date"
                                    value={endDate}
                                    onChange={setEndDate}
                                    autoComplete="off"
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
                    )}
                 </BlockStack>
            </Card>

            <Card>
                <BlockStack gap="400">
                    <Text as="h2" variant="headingSm">Activation</Text>
                     <Checkbox
                        label="Allow this sale to override other Rockit discounts"
                        checked={allowOverride}
                        onChange={setAllowOverride}
                        helpText="By default, Rockit skips products already discounted by another active Rockit sale. When checked, this sale will override those existing discounts."
                    />
                </BlockStack>
            </Card>

             <Card>
                <BlockStack gap="400">
                    <Text as="h2" variant="headingSm">Deactivation</Text>
                     <BlockStack gap="200">
                        <RadioButton
                            label="Restore prices exactly as they were before the sale activation"
                            checked={deactivationStrategy === "RESTORE"}
                            id="deactivate-restore"
                            name="deactivationStrategy"
                            onChange={() => setDeactivationStrategy("RESTORE")}
                             helpText="If a product was already on sale, it will return to that sale price after deactivation."
                        />
                        <RadioButton
                            label="Replace current price with compare-at price and remove compare-at value"
                            checked={deactivationStrategy === "REPLACE_WITH_COMPARE"}
                            id="deactivate-replace"
                            name="deactivationStrategy"
                            onChange={() => setDeactivationStrategy("REPLACE_WITH_COMPARE")}
                        />
                     </BlockStack>
                </BlockStack>
            </Card>
            
             <Card>
                <BlockStack gap="400">
                    <Text as="h2" variant="headingSm">Product page timer</Text>
                    <Text as="p" tone="subdued">The timer will be automatically configured with the sale's end date upon activation.</Text>
                    <Select
                        label="Timer display"
                        labelHidden
                        options={[{ label: "Display no timer", value: "no-timer" }]}
                        value={timerDisplay}
                        onChange={setTimerDisplay}
                    />
                </BlockStack>
            </Card>

            <Card>
                 <BlockStack gap="400">
                    <Text as="h2" variant="headingSm">Product tags</Text>
                    <TextField
                        label="Tags to add during sale activation (removes upon deactivation)"
                        placeholder="Search tags"
                        value={tagsToAdd}
                        onChange={setTagsToAdd}
                         autoComplete="off"
                         prefix={<Icon source={SearchIcon} />}
                    />
                     <TextField
                        label="Tags to remove during sale activation (resets upon deactivation)"
                        placeholder="Search tags"
                        value={tagsToRemove}
                        onChange={setTagsToRemove}
                         autoComplete="off"
                         prefix={<Icon source={SearchIcon} />}
                    />
                 </BlockStack>
            </Card>
            
            <div style={{ marginTop: "1rem", marginBottom: "3rem" }}>
                 <Button submit primary loading={isLoading} size="large">Create Discount</Button>
            </div>

          </BlockStack>
        </Layout.Section>
        
        <Layout.Section variant="oneThird">
             <Card>
                <BlockStack gap="200">
                    <Text as="h2" variant="headingSm">Summary</Text>
                    <Text as="p" fontWeight="bold">{title || "No title yet"}</Text>
                    <Text as="p" fontWeight="semibold">Details</Text>
                    <List type="bullet">
                        <List.Item>{value}% off {selectedItems.length} products</List.Item>
                         <List.Item>Active from {new Date(`${startDate}T${startTime}`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</List.Item>
                    </List>
                </BlockStack>
             </Card>
             <div style={{ marginTop: "1rem" }}>
                 <Card>
                    <BlockStack gap="200">
                        <Text as="p">Have an idea for a missing feature? We'd love to hear it!</Text>
                        <Button variant="plain" external>Request a feature</Button>
                    </BlockStack>
                 </Card>
             </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
