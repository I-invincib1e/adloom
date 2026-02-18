import { useState, useCallback, useEffect } from "react";
import { json, redirect } from "@remix-run/node";
import { useActionData, useSubmit, useNavigation, useLoaderData, useNavigate, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { DirtyStateModal } from "../components/DirtyStateModal";
import { authenticate } from "../shopify.server";
import { createSale, applySale } from "../models/sale.server"; 
import { getTimers } from "../models/timer.server";
import { checkLimit } from "../models/billing.server";
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
  Tag,
  Thumbnail,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { SearchIcon } from "@shopify/polaris-icons";
import { StrategyExample } from "../components/StrategyExample";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const allowed = await checkLimit(request, "sales");
  try {
    const timers = await getTimers(session.shop);
    return json({ timers, allowed });
  } catch (error) {
    console.error("Loader failed:", error);
    throw new Response("Failed to load timers", { status: 500 });
  }
}

export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const allowed = await checkLimit(request, "sales");
  if (!allowed) {
    return json({ errors: { base: "You have reached the limit for your current plan. Please upgrade to create more sales." } }, { status: 403 });
  }

  try {
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
  const timerId = formData.get("timerId");
  const tagsToAdd = formData.get("tagsToAdd");
  const tagsToRemove = formData.get("tagsToRemove");

  const appliesToType = formData.get("appliesToType");
  const selectedCollections = JSON.parse(formData.get("selectedCollections") || "[]");
  const selectedTags = JSON.parse(formData.get("selectedTags") || "[]");
  const selectedVendors = JSON.parse(formData.get("selectedVendors") || "[]");

  let items = JSON.parse(itemsString || "[]");

  // Fetch products if items are empty but other selections exist
  if (items.length === 0) {
      if (appliesToType === "collections" && selectedCollections.length > 0) {
          for (const collection of selectedCollections) {
               const collectionGid = collection.id;
               const response = await admin.graphql(`
                 query getCollectionProducts($id: ID!) {
                   collection(id: $id) {
                     products(first: 50) {
                       edges {
                         node {
                           id
                           title
                           variants(first: 50) {
                             edges {
                               node {
                                 id
                                 title
                               }
                             }
                           }
                         }
                       }
                     }
                   }
                 }
               `, { variables: { id: collectionGid } });
               const data = await response.json();
               const products = data?.data?.collection?.products?.edges || [];
               products.forEach(({ node: product }) => {
                   const variants = product.variants?.edges || [];
                   variants.forEach(({ node: variant }) => {
                       items.push({
                           productId: product.id,
                           variantId: variant.id,
                           productTitle: product.title,
                           variantTitle: variant.title,
                       });
                   });
               });
          }
      } else if (appliesToType === "tags" && selectedTags.length > 0) {
           const tagQuery = selectedTags.map(t => `tag:${t}`).join(" OR ");
           const response = await admin.graphql(`
             query getProductsByTag($query: String!) {
               products(first: 50, query: $query) {
                 edges {
                   node {
                     id
                     title
                     variants(first: 50) {
                       edges {
                         node {
                           id
                           title
                         }
                       }
                     }
                   }
                 }
               }
             }
           `, { variables: { query: tagQuery } });
           const data = await response.json();
           const products = data?.data?.products?.edges || [];
           products.forEach(({ node: product }) => {
               const variants = product.variants?.edges || [];
               variants.forEach(({ node: variant }) => {
                   items.push({
                       productId: product.id,
                       variantId: variant.id,
                       productTitle: product.title,
                       variantTitle: variant.title,
                   });
               });
           });
      } else if (appliesToType === "vendors" && selectedVendors.length > 0) {
           const vendorQuery = selectedVendors.map(v => `vendor:${v}`).join(" OR ");
           const response = await admin.graphql(`
             query getProductsByVendor($query: String!) {
               products(first: 50, query: $query) {
                 edges {
                   node {
                     id
                     title
                     variants(first: 50) {
                       edges {
                         node {
                           id
                           title
                         }
                       }
                     }
                   }
                 }
               }
             }
           `, { variables: { query: vendorQuery } });
           const data = await response.json();
           const products = data?.data?.products?.edges || [];
           products.forEach(({ node: product }) => {
               const variants = product.variants?.edges || [];
               variants.forEach(({ node: variant }) => {
                   items.push({
                       productId: product.id,
                       variantId: variant.id,
                       productTitle: product.title,
                       variantTitle: variant.title,
                   });
               });
           });
      }
  }

  const errors = {};
  if (!title) errors.title = "Title is required";
  if (!value) errors.value = "Value is required";
  if (!startTime) errors.startTime = "Start time is required";
  if (!endTime) errors.endTime = "End time is required"; 
  if (items.length === 0) errors.items = "Select at least one product or collection";

  if (Object.keys(errors).length > 0) {
    return json({ errors });
  }

  // Deduplicate items
  const uniqueItems = Array.from(new Map(items.map(item => [item.variantId, item])).values());

  const sale = await createSale({
    shop: session.shop,
    title,
    discountType,
    value,
    startTime,
    endTime,
    items: uniqueItems,
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
  let updatedCount = 0;
  if (start <= now) {
    updatedCount = await applySale(sale.id, admin);
  }

  return redirect(`/app?success=true&count=${updatedCount || 0}`);
  } catch (error) {
    console.error("Action failed:", error);
    return json({ errors: { base: "Failed to create sale. Please try again." } }, { status: 500 });
  }
}

export default function NewSale() {
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const actionData = useActionData();
  const { timers, allowed } = useLoaderData();
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    if (actionData?.errors?.base) {
      shopify.toast.show(actionData.errors.base, { isError: true });
    }
  }, [actionData]);
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
  const [timerId, setTimerId] = useState("");
  const [tagsToAdd, setTagsToAdd] = useState("");
  const [tagsToRemove, setTagsToRemove] = useState("");
  const [combinationsOpen, setCombinationsOpen] = useState(false);
  const [showExample, setShowExample] = useState(false);

  const submit = useSubmit();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  // --- Unsaved changes guard ---
  const [isDirty, setIsDirty] = useState(false);
  const dirty = (setter) => (val) => { setIsDirty(true); setter(val); };

  const [selectedCollections, setSelectedCollections] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [vendorInput, setVendorInput] = useState("");

  // Validation State
  const [touched, setTouched] = useState({});
  const [clientErrors, setClientErrors] = useState({});

  const validateField = useCallback((field, val) => {
    let error = null;
    if (field === "title" && !val) error = "Title is required";
    if (field === "value") {
      if (!val) error = "Value is required";
      else if (parseFloat(val) < 0) error = "Value cannot be negative";
    }
    if (field === "items" && val.length === 0) error = "Select at least one product";
    
    setClientErrors(prev => ({ ...prev, [field]: error }));
    return error;
  }, []);

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    // Validate current value
    if (field === "title") validateField("title", title);
    if (field === "value") validateField("value", value);
  };

  // Live Preview Helper
  const getPreviewData = () => {
    if (selectedItems.length === 0) return null;
    const item = selectedItems[0];
    const price = item.price || item.variants?.[0]?.price || "0";
    const originalPrice = parseFloat(price);
    
    let discountedPrice = originalPrice;
    const discountVal = parseFloat(value) || 0;

    if (discountType === "PERCENTAGE") {
      discountedPrice = originalPrice - (originalPrice * (discountVal / 100));
    } else {
      discountedPrice = originalPrice - discountVal;
    }
    
    if (overrideCents) {
       discountedPrice = Math.floor(discountedPrice) + 0.99;
    }

    return {
      title: item.title,
      original: originalPrice.toFixed(2),
      discounted: Math.max(0, discountedPrice).toFixed(2),
      image: item.images?.[0]?.originalSrc || item.image?.originalSrc || ""
    };
  };

  const preview = getPreviewData();

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
            image: product.images[0]?.originalSrc,
          });
        });
      });
      setSelectedItems(variants);
    }
  };

  const selectCollections = async () => {
    const response = await shopify.resourcePicker({
        type: "collection",
        multiple: true,
    });

    if (response) {
        setSelectedCollections(response);
    }
  };

  const handleBrowse = () => {
      if (appliesToType === "products") selectProducts();
      else if (appliesToType === "collections") selectCollections();
  };

  const removeCollection = (id) => {
      setSelectedCollections(selectedCollections.filter(c => c.id !== id));
  };

  const handleSubmit = () => {
    // Validation: timer is required
    if (!timerId) {
      shopify.toast.show("A timer is required. Please select or create a timer.", { isError: true });
      return;
    }

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
    formData.append("timerId", timerId);
    formData.append("tagsToAdd", tagsToAdd);
    formData.append("tagsToRemove", tagsToRemove);

    formData.append("appliesToType", appliesToType);
    formData.append("selectedCollections", JSON.stringify(selectedCollections));
    formData.append("selectedTags", JSON.stringify(selectedTags));
    formData.append("selectedVendors", JSON.stringify(selectedVendors));

    submit(formData, { method: "post" });
  };

  return (
    <Page
      title="Create price discount"
      backAction={{ url: "/app" }}
      primaryAction={{
        content: "Save",
        onAction: submit,
        loading: isLoading,
        disabled: !allowed,
      }}
    >
      <DirtyStateModal isDirty={isDirty} />
      {!allowed && (
        <Layout>
          <Layout.Section>
            <Banner tone="warning" title="Limit Reached">
              <p>You have reached the limit of active sales for your current plan. <Button variant="plain" url="/app/pricing">Upgrade now</Button> to create more.</p>
            </Banner>
          </Layout.Section>
        </Layout>
      )}
      <Layout>
        <Layout.Section>
          <div className="animate-fade-in-up stagger-1">
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

            <div className="elite-card">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingSm">Title</Text>
                  <div className="elite-input-focus">
                    <TextField
                      label="Title"
                      labelHidden
                      value={title}
                      onChange={(val) => { dirty(setTitle)(val); validateField("title", val); }}
                      onBlur={() => handleBlur("title")}
                      autoComplete="off"
                      maxLength={50}
                      showCharacterCount
                      helpText="Internal name for this sale."
                      error={(touched.title && clientErrors.title) || actionData?.errors?.title}
                    />
                  </div>
                </BlockStack>
              </Card>
            </div>

            <div className="animate-fade-in-up stagger-2 elite-card">
              <Card>
                <BlockStack gap="400">
                   <Text as="h2" variant="headingSm">Discount value</Text>
                   <InlineStack gap="400">
                      <div style={{ flex: 1 }} className="elite-input-focus">
                          <Select
                              label="Discount type"
                              labelHidden
                              options={[
                                { label: "Percentage", value: "PERCENTAGE" },
                                { label: "Fixed Amount", value: "FIXED_AMOUNT" },
                              ]}
                              value={discountType}
                              onChange={dirty(setDiscountType)}
                          />
                      </div>
                      <div style={{ flex: 1 }} className="elite-input-focus">
                          <TextField
                              label="Value"
                              labelHidden
                              type="number"
                              value={value}
                              onChange={(val) => { dirty(setValue)(val); validateField("value", val); }}
                              onBlur={() => handleBlur("value")}
                              suffix={discountType === "PERCENTAGE" ? "%" : ""}
                              autoComplete="off"
                              error={(touched.value && clientErrors.value) || actionData?.errors?.value}
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
            </div>

            <Card>
              <BlockStack gap="400">
                 <InlineStack align="space-between">
                    <Text as="h2" variant="headingSm">Discount strategy</Text>
                     <Button 
                       variant="plain" 
                       onClick={() => setShowExample(!showExample)}
                     >
                       {showExample ? "Hide example" : "Show example"}
                     </Button>
                 </InlineStack>

                  <Collapsible open={showExample} id="strategy-example">
                    <Box paddingBlockEnd="400">
                      <StrategyExample 
                        strategy={discountStrategy} 
                        discountType={discountType} 
                        value={value} 
                      />
                    </Box>
                  </Collapsible>
                 
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
                                options={[
                                    { label: "Products / Variants", value: "products" },
                                    { label: "Collections", value: "collections" },
                                    { label: "Tags", value: "tags" },
                                    { label: "Vendors", value: "vendors" },
                                    { label: "Whole store", value: "all" },
                                ]}
                                value={appliesToType}
                                onChange={setAppliesToType}
                                label="Applies to"
                                labelHidden
                             />
                         </div>
                         <div style={{ flex: 2 }}>
                            {appliesToType === "tags" ? (
                                <TextField
                                    value={tagInput}
                                    onChange={setTagInput}
                                    placeholder="Search tags"
                                    autoComplete="off"
                                    prefix={<Icon source={SearchIcon} />}
                                    connectedRight={<Button onClick={() => {
                                        if (tagInput && !selectedTags.includes(tagInput)) {
                                            setSelectedTags([...selectedTags, tagInput]);
                                            setTagInput("");
                                        }
                                    }}>Add</Button>}
                                    label="Search tags"
                                    labelHidden
                                />
                            ) : appliesToType === "vendors" ? (
                                <TextField
                                    value={vendorInput}
                                    onChange={setVendorInput}
                                    placeholder="Search vendors"
                                    autoComplete="off"
                                    prefix={<Icon source={SearchIcon} />}
                                    connectedRight={<Button onClick={() => {
                                        if (vendorInput && !selectedVendors.includes(vendorInput)) {
                                            setSelectedVendors([...selectedVendors, vendorInput]);
                                            setVendorInput("");
                                        }
                                    }}>Add</Button>}
                                    label="Search vendors"
                                    labelHidden
                                />
                            ) : (
                                <TextField
                                    value={""}
                                    placeholder={appliesToType === "collections" ? "Search collections" : "Search products"}
                                    autoComplete="off"
                                    prefix={<Icon source={SearchIcon} />}
                                    connectedRight={<Button onClick={handleBrowse} disabled={appliesToType === "all"}>Browse</Button>}
                                    label="Search"
                                    labelHidden
                                    disabled={appliesToType === "all"}
                                />
                            )}
                         </div>
                    </InlineStack>

                    {appliesToType === "collections" && (
                        <Banner tone="info">
                            <p><strong>Important!</strong></p>
                            <p>Be aware that Shopify has an internal issue with filtering products in smart collections. <Button variant="plain" external>Read more</Button></p>
                        </Banner>
                    )}

                    {/* Selected Items List */}
                     {appliesToType === "products" && selectedItems.length > 0 && (
                        <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                           <InlineStack align="space-between">
                                <Text variant="bodySm">{selectedItems.length} variants selected</Text>
                                <Button variant="plain" onClick={() => setSelectedItems([])}>Remove all</Button>
                           </InlineStack>
                        </Box>
                     )}

                     {appliesToType === "collections" && selectedCollections.length > 0 && (
                        <BlockStack gap="200">
                             <InlineStack align="space-between">
                                <Checkbox label={`${selectedCollections.length} selected`} checked={true} disabled/>
                                <Button size="slim" onClick={() => setSelectedCollections([])}>Remove collections</Button>
                             </InlineStack>
                             {selectedCollections.map(collection => (
                                 <Box key={collection.id} padding="200" background="bg-surface-secondary" borderRadius="200">
                                    <InlineStack gap="400" align="start" blockAlign="center">
                                        <Checkbox checked={true} onChange={() => removeCollection(collection.id)}/>
                                        <Thumbnail
                                            source={collection.image?.originalSrc || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-collection-1_small.png?format=webp&v=1530129177"}
                                            alt={collection.title}
                                        />
                                        <Text fontWeight="bold" as="span">{collection.title}</Text>
                                    </InlineStack>
                                 </Box>
                             ))}
                        </BlockStack>
                     )}
                     
                     {appliesToType === "tags" && selectedTags.length > 0 && (
                        <InlineStack gap="200">
                            {selectedTags.map(tag => (
                                <Tag key={tag} onRemove={() => setSelectedTags(selectedTags.filter(t => t !== tag))}>{tag}</Tag>
                            ))}
                        </InlineStack>
                     )}

                     {appliesToType === "vendors" && selectedVendors.length > 0 && (
                        <InlineStack gap="200">
                            {selectedVendors.map(vendor => (
                                <Tag key={vendor} onRemove={() => setSelectedVendors(selectedVendors.filter(v => v !== vendor))}>{vendor}</Tag>
                            ))}
                        </InlineStack>
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
                     <BlockStack gap="200">
                        <Button 
                            variant="plain" 
                            onClick={() => setCombinationsOpen(!combinationsOpen)}
                            textAlign="left"
                        >
                            <Text as="p" tone="subdued">How to prevent combining <strong>discount codes</strong> with products on sale. {combinationsOpen ? "Hide instructions" : "Show instructions"}</Text>
                        </Button>
                        <Collapsible open={combinationsOpen} id="combinations-collapsible">
                            <Box paddingBlockStart="200">
                                <Text as="p" variant="bodyMd">
                                    Currently, Shopify doesn't have a native feature to directly restrict discount codes from being applied to sale items. However, you can achieve a similar outcome by configuring your discount codes to apply only to products that are not on sale (don't have compare-at price set). Here's how:
                                </Text>
                                <List type="number">
                                    <List.Item>
                                        <strong>Create an Automated Collection named "Not on sale":</strong>
                                        <List type="bullet">
                                            <List.Item>Go to your Shopify Admin panel.</List.Item>
                                            <List.Item>Navigate to Products {">"} Collections.</List.Item>
                                            <List.Item>Click on "Create Collection.”</List.Item>
                                            <List.Item>Choose "Automated" as the collection type.</List.Item>
                                            <List.Item>Set the condition to "Compare at price is empty." This condition ensures that only products not currently on sale will be included in this collection.</List.Item>
                                        </List>
                                    </List.Item>
                                    <List.Item>
                                        <strong>Restrict desired discount codes to this collection:</strong>
                                        <List type="bullet">
                                            <List.Item>In your Shopify Admin panel, go to Discounts.</List.Item>
                                            <List.Item>Select the discount code you want to restrict.</List.Item>
                                            <List.Item>Under Discount Details, go to Applies To.</List.Item>
                                            <List.Item>Choose "Specific Collection" and select the "Not on sale" collection you created earlier.</List.Item>
                                        </List>
                                    </List.Item>
                                </List>
                                <Text as="p" variant="bodyMd" paddingBlockStart="200">
                                    By following these steps, you can effectively limit the use of discount codes to products that are not currently on sale in your Shopify store.
                                </Text>
                            </Box>
                        </Collapsible>
                     </BlockStack>
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
                    {!timerId && (
                      <Banner tone="warning">
                        <p>A timer is required to create a sale. Please select an existing timer or create a new one.</p>
                      </Banner>
                    )}
                    <Select
                        label="Timer display"
                        labelHidden
                        options={[
                          { label: "＋ Create new timer", value: "__create_new__" },
                          ...((useLoaderData()?.timers || []).map(t => ({ label: t.name, value: t.id })))
                        ]}
                        value={timerId}
                        onChange={(val) => {
                          if (val === "__create_new__") {
                            navigate("/app/timers/new");
                          } else {
                            setTimerId(val);
                          }
                        }}
                        error={!timerId ? "A timer is required" : undefined}
                    />
                </BlockStack>
            </Card>

            <Card>
                 <BlockStack gap="400">
                    <Text as="h2" variant="headingSm">Product tags</Text>
                    
                    <BlockStack gap="200">
                        <Text as="p" variant="bodyMd">Tags to add during sale activation (removes upon deactivation)</Text>
                         <TextField
                            label="Tags to add"
                            labelHidden
                            placeholder="Search tags"
                            value={tagsToAdd}
                            onChange={setTagsToAdd}
                            autoComplete="off"
                            prefix={<Icon source={SearchIcon} />}
                            helpText="Separate tags with comma"
                        />
                        {tagsToAdd && (
                            <InlineStack gap="200">
                                {tagsToAdd.split(",").filter(t => t.trim()).map((tag, i) => (
                                    <Tag key={i}>{tag.trim()}</Tag>
                                ))}
                            </InlineStack>
                        )}
                    </BlockStack>

                     <BlockStack gap="200">
                        <Text as="p" variant="bodyMd">Tags to remove during sale activation (resets upon deactivation)</Text>
                         <TextField
                            label="Tags to remove"
                            labelHidden
                            placeholder="Search tags"
                            value={tagsToRemove}
                            onChange={setTagsToRemove}
                            autoComplete="off"
                            prefix={<Icon source={SearchIcon} />}
                             helpText="Separate tags with comma"
                        />
                         {tagsToRemove && (
                            <InlineStack gap="200">
                                {tagsToRemove.split(",").filter(t => t.trim()).map((tag, i) => (
                                    <Tag key={i}>{tag.trim()}</Tag>
                                ))}
                            </InlineStack>
                        )}
                    </BlockStack>
                 </BlockStack>
            </Card>
            
            <div style={{ marginTop: "1rem", marginBottom: "3rem" }}>
                 <Button variant="primary" loading={isLoading} size="large" onClick={handleSubmit}>Create Discount</Button>
            </div>

          </BlockStack>
          </div>
        </Layout.Section>
        
        <Layout.Section variant="oneThird">
             {preview && (
                 <Card>
                    <BlockStack gap="200">
                        <Text as="h2" variant="headingSm">Live Preview</Text>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {preview.image && (
                                <img src={preview.image} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
                            )}
                            <div>
                                <Text as="p" variant="bodySm" tone="subdued">{preview.title}</Text>
                                <div style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
                                    <Text as="span" textDecoration="line-through" tone="subdued">${preview.original}</Text>
                                    <Text as="span" fontWeight="bold" tone="success">${preview.discounted}</Text>
                                </div>
                            </div>
                        </div>
                         {overrideCents && <Text as="p" variant="bodyXs" tone="subdued">Ending in .99</Text>}
                    </BlockStack>
                 </Card>
             )}
             <div style={{ marginTop: "1rem" }}>
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
             </div>
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
