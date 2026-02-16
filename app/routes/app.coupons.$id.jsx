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
  Tag,
  Tabs,
  RangeSlider,
  FormLayout,
} from "@shopify/polaris";

export async function loader({ request, params }) {
  const { admin, session } = await authenticate.admin(request);
  const coupon = await getCoupon(params.id, session.shop);
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
  const { session } = await authenticate.admin(request);
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

  const coupon = await getCoupon(params.id, session.shop);
  if (!coupon) throw new Response("Unauthorized", { status: 403 });

  await updateCoupon(params.id, {
    shop: session.shop,
    offerTitle,
    couponCode: couponCode.toUpperCase(),
    description,
    startTime,
    endTime,
    style,
    products,
  });

  return json({ success: true, message: "Offer updated successfully." });
}

export default function EditCouponPage() {
  const { coupon } = useLoaderData();
  const shopify = useAppBridge();
  const submit = useSubmit();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  const [selectedTab, setSelectedTab] = useState(0);

  // Parse style config
  let initialStyle = {
    backgroundColor: "#ffffff",
    borderColor: "#e1e3e5",
    textColor: "#202223",
    codeColor: "#111111",
    borderRadius: 8,
    fontSize: 14,
    typography: "Inter",
    borderStyle: "solid",
    preset: "standard",
    selection: { type: "products", products: [], collections: [], tags: [], vendors: [] }
  };

  try {
    if (coupon.style && coupon.style.startsWith('{')) {
      const parsed = JSON.parse(coupon.style);
      initialStyle = { ...initialStyle, ...parsed };
    } else {
      initialStyle.preset = coupon.style || "standard";
    }
  } catch (e) { console.error("Style parse error", e); }

  const [offerTitle, setOfferTitle] = useState(coupon.offerTitle);
  const [couponCode, setCouponCode] = useState(coupon.couponCode);
  const [description, setDescription] = useState(coupon.description || "");

  const startDT = new Date(coupon.startTime);
  const endDT = new Date(coupon.endTime);
  const [startDate, setStartDate] = useState(startDT.toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState(startDT.toTimeString().slice(0, 5));
  const [endDate, setEndDate] = useState(endDT.toISOString().split("T")[0]);
  const [endTime, setEndTime] = useState(endDT.toTimeString().slice(0, 5));

  // Applies To State
  const [appliesToType, setAppliesToType] = useState(initialStyle.selection?.type || "products");
  const [selectedProducts, setSelectedProducts] = useState(coupon.enrichedProducts || []);
  const [selectedCollections, setSelectedCollections] = useState(initialStyle.selection?.collections || []);
  const [selectedTags, setSelectedTags] = useState(initialStyle.selection?.tags || []);
  const [selectedVendors, setSelectedVendors] = useState(initialStyle.selection?.vendors || []);
  const [tagInput, setTagInput] = useState("");
  const [vendorInput, setVendorInput] = useState("");

  // Styling State
  const [stylePreset, setStylePreset] = useState(initialStyle.preset);
  const [styleConfig, setStyleConfig] = useState({
    backgroundColor: initialStyle.backgroundColor,
    borderColor: initialStyle.borderColor,
    textColor: initialStyle.textColor,
    codeColor: initialStyle.codeColor,
    borderRadius: initialStyle.borderRadius,
    fontSize: initialStyle.fontSize,
    typography: initialStyle.typography,
    borderStyle: initialStyle.borderStyle,
  });

  const tabs = [
    { id: "coupon", content: "Coupon Details" },
    { id: "style", content: "Visual Style" },
  ];

  const PRESETS = {
    standard: {
      backgroundColor: "#ffffff",
      borderColor: "#e1e3e5",
      textColor: "#202223",
      codeColor: "#111111",
      borderRadius: 8,
      borderStyle: "solid",
      className: "",
    },
    neon: {
      backgroundColor: "#000000",
      borderColor: "#00ffff",
      textColor: "#00ffff",
      codeColor: "#ffffff",
      borderRadius: 4,
      borderStyle: "solid",
      className: "coupon-neon",
    },
    gold: {
      backgroundColor: "linear-gradient(135deg, #bf953f, #fcf6ba, #b38728)",
      borderColor: "#aa771c",
      textColor: "#3e2b00",
      codeColor: "#ffffff",
      borderRadius: 12,
      borderStyle: "solid",
      className: "coupon-gold",
    },
    glass: {
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      borderColor: "rgba(255, 255, 255, 0.3)",
      textColor: "#000000",
      codeColor: "#000000",
      borderRadius: 16,
      borderStyle: "solid",
      className: "coupon-glass",
    },
    minimal: {
      backgroundColor: "#ffffff",
      borderColor: "#111111",
      textColor: "#111111",
      codeColor: "#111111",
      borderRadius: 0,
      borderStyle: "solid",
      className: "coupon-minimal-luxe",
    },
    ticket: {
      backgroundColor: "#ffffff",
      borderColor: "#e1e3e5",
      textColor: "#202223",
      codeColor: "#111111",
      borderRadius: 4,
      borderStyle: "dashed",
      className: "ticket-stub",
    }
  };

  const handlePresetChange = (presetKey) => {
    setStylePreset(presetKey);
    const p = PRESETS[presetKey];
    setStyleConfig(prev => ({ ...prev, ...p }));
  };

  const selectProducts = async () => {
    const response = await shopify.resourcePicker({ type: "product", multiple: true });
    if (response) {
      setSelectedProducts(response.map(p => ({
        productId: p.id,
        productTitle: p.title,
        image: p.images[0]?.originalSrc || null,
      })));
    }
  };

  const selectCollections = async () => {
    const response = await shopify.resourcePicker({ type: "collection", multiple: true });
    if (response) {
      setSelectedCollections(response.map(c => ({
        id: c.id,
        title: c.title,
        image: c.image?.originalSrc || null,
      })));
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
    
    const appliesTo = {
      type: appliesToType,
      products: selectedProducts,
      collections: selectedCollections,
      tags: selectedTags,
      vendors: selectedVendors,
    };

    const finalStyle = {
      ...styleConfig,
      preset: stylePreset,
      selection: appliesTo,
    };
    formData.append("style", JSON.stringify(finalStyle));
    formData.append("products", JSON.stringify(appliesTo));

    submit(formData, { method: "post" });
  };

  const PremiumToggle = ({ options, value, onChange }) => (
    <div className="toggle-container">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`toggle-btn ${value === opt.value ? "active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const ColorInput = ({ label, value, onChange }) => (
    <div style={{ flex: 1 }}>
      <TextField
        label={label}
        value={value}
        onChange={onChange}
        autoComplete="off"
        prefix={
          <div style={{ position: "relative", width: 24, height: 24 }}>
             <div style={{ position: "absolute", inset: 0, background: value, borderRadius: 4, border: "1px solid #ddd" }} />
             <input
                type="color"
                value={value?.includes('gradient') ? "#ffffff" : value}
                onChange={(e) => onChange(e.target.value)}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
             />
          </div>
        }
      />
    </div>
  );

  const renderCouponTab = () => (
    <BlockStack gap="400" className="animate-fade-in-up stagger-1">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingSm">Offer Details</Text>
          <TextField label="Offer title" value={offerTitle} onChange={setOfferTitle} autoComplete="off" placeholder="e.g. Buy 1 Get 1 Free" />
          <TextField label="Coupon code" value={couponCode} onChange={setCouponCode} autoComplete="off" placeholder="e.g. BYG1" monospaced />
          <TextField label="Description (optional)" value={description} onChange={setDescription} autoComplete="off" multiline={2} />
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingSm">Schedule</Text>
          <FormLayout>
            <FormLayout.Group>
               <TextField label="Start date" type="date" value={startDate} onChange={setStartDate} autoComplete="off" />
               <TextField label="Start time" type="time" value={startTime} onChange={setStartTime} autoComplete="off" />
            </FormLayout.Group>
            <FormLayout.Group>
               <TextField label="End date" type="date" value={endDate} onChange={setEndDate} autoComplete="off" />
               <TextField label="End time" type="time" value={endTime} onChange={setEndTime} autoComplete="off" />
            </FormLayout.Group>
          </FormLayout>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingSm">Applies To</Text>
          <PremiumToggle
            value={appliesToType}
            onChange={setAppliesToType}
            options={[
              { label: "Products", value: "products" },
              { label: "Collections", value: "collections" },
              { label: "Tags", value: "tags" },
              { label: "Vendors", value: "vendors" },
              { label: "Whole Store", value: "all" },
            ]}
          />
          <Box paddingBlockStart="200">
            {appliesToType === "products" && (
              <BlockStack gap="300">
                <Button onClick={selectProducts}>Browse Products</Button>
                <ResourceScrollArea items={selectedProducts} onRemove={(id) => setSelectedProducts(prev => prev.filter(p => p.productId !== id))} idKey="productId" titleKey="productTitle" />
              </BlockStack>
            )}
            {appliesToType === "collections" && (
              <BlockStack gap="300">
                <Button onClick={selectCollections}>Browse Collections</Button>
                <ResourceScrollArea items={selectedCollections} onRemove={(id) => setSelectedCollections(prev => prev.filter(c => c.id !== id))} idKey="id" titleKey="title" />
              </BlockStack>
            )}
            {appliesToType === "tags" && (
              <BlockStack gap="300">
                <TextField
                  label="Enter Tags"
                  placeholder="sale, hot, winter"
                  value={tagInput}
                  onChange={setTagInput}
                  connectedRight={<Button variant="primary" onClick={() => { if(tagInput) { setSelectedTags(prev => [...new Set([...prev, ...tagInput.split(',').map(t => t.trim())])]); setTagInput(""); } }}>Add</Button>}
                  autoComplete="off"
                />
                <InlineStack gap="200">
                  {selectedTags.map(tag => <Tag key={tag} onRemove={() => setSelectedTags(prev => prev.filter(t => t !== tag))}>{tag}</Tag>)}
                </InlineStack>
              </BlockStack>
            )}
            {appliesToType === "vendors" && (
              <BlockStack gap="300">
                 <TextField
                  label="Enter Vendors"
                  placeholder="Apple, Nike"
                  value={vendorInput}
                  onChange={setVendorInput}
                  connectedRight={<Button variant="primary" onClick={() => { if(vendorInput) { setSelectedVendors(prev => [...new Set([...prev, ...vendorInput.split(',').map(v => v.trim())])]); setVendorInput(""); } }}>Add</Button>}
                  autoComplete="off"
                />
                <InlineStack gap="200">
                  {selectedVendors.map(v => <Tag key={v} onRemove={() => setSelectedVendors(prev => prev.filter(t => t !== v))}>{v}</Tag>)}
                </InlineStack>
              </BlockStack>
            )}
            {appliesToType === "all" && <Banner tone="info">This coupon will be shown on all product pages.</Banner>}
          </Box>
        </BlockStack>
      </Card>
    </BlockStack>
  );

  const renderStyleTab = () => (
     <BlockStack gap="400" className="animate-fade-in-up">
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingSm">Design Presets</Text>
            <Box paddingBlockStart="200">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                {Object.keys(PRESETS).map(key => (
                  <div key={key} onClick={() => handlePresetChange(key)} style={{ 
                      padding: "12px", borderRadius: "12px", 
                      border: `2px solid ${stylePreset === key ? "var(--p-color-border-interactive)" : "transparent"}`,
                      background: "var(--p-color-bg-surface-secondary)",
                      cursor: "pointer", textAlign: "center", transition: "all 0.2s"
                  }}>
                    <div style={{ width: "100%", height: "40px", borderRadius: "4px", marginBottom: "8px", overflow: "hidden", border: "1px solid #ddd" }}>
                       <div style={{ width: "100%", height: "100%", background: PRESETS[key].backgroundColor, display: "flex", alignItems: "center", justifyContent: "center", color: PRESETS[key].textColor, fontSize: "10px", fontWeight: "bold" }}>ABC10</div>
                    </div>
                    <Text variant="bodyXs" fontWeight="medium">{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                  </div>
                ))}
              </div>
            </Box>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingSm">Manual Customization</Text>
            <FormLayout>
              <FormLayout.Group>
                 <ColorInput label="Background" value={styleConfig.backgroundColor} onChange={(v) => setStyleConfig(s => ({ ...s, backgroundColor: v }))} />
                 <ColorInput label="Border" value={styleConfig.borderColor} onChange={(v) => setStyleConfig(s => ({ ...s, borderColor: v }))} />
              </FormLayout.Group>
              <FormLayout.Group>
                 <ColorInput label="Text Color" value={styleConfig.textColor} onChange={(v) => setStyleConfig(s => ({ ...s, textColor: v }))} />
                 <ColorInput label="Code Color" value={styleConfig.codeColor} onChange={(v) => setStyleConfig(s => ({ ...s, codeColor: v }))} />
              </FormLayout.Group>
              <FormLayout.Group>
                <Select label="Typography" options={["Inter", "Roboto", "Monospace", "Serif", "Outfit"].map(f => ({ label: f, value: f }))} value={styleConfig.typography} onChange={(v) => setStyleConfig(s => ({ ...s, typography: v }))} />
                <Select label="Border Style" options={[{ label: "Solid", value: "solid" }, { label: "Dashed", value: "dashed" }, { label: "Dotted", value: "dotted" }, { label: "Double", value: "double" }]} value={styleConfig.borderStyle} onChange={(v) => setStyleConfig(s => ({ ...s, borderStyle: v }))} />
              </FormLayout.Group>
              <RangeSlider label="Corner Radius" value={styleConfig.borderRadius} onChange={(v) => setStyleConfig(s => ({ ...s, borderRadius: v }))} min={0} max={30} output />
              <RangeSlider label="Font Size" value={styleConfig.fontSize} onChange={(v) => setStyleConfig(s => ({ ...s, fontSize: v }))} min={12} max={24} output />
            </FormLayout>
          </BlockStack>
        </Card>
     </BlockStack>
  );

  return (
    <Page title="Edit Offer" backAction={{ url: "/app/coupons" }}>
      <Layout>
        <Layout.Section>
          {actionData?.success && <Banner tone="success" title={actionData.message} marginBottom="400" />}
          <Card padding="0">
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <Box padding="500">
                {selectedTab === 0 ? renderCouponTab() : renderStyleTab()}
              </Box>
            </Tabs>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card title="Live Preview" className="elite-card">
              <BlockStack gap="400">
                <Text variant="headingSm">Live Preview</Text>
                <div style={{ padding: "10px 0" }}>
                   <div className={`${PRESETS[stylePreset]?.className || ""}`} style={{
                      background: styleConfig.backgroundColor,
                      border: `${styleConfig.borderStyle} 1px ${styleConfig.borderColor}`,
                      borderRadius: `${styleConfig.borderRadius}px`,
                      padding: "16px",
                      color: styleConfig.textColor,
                      fontFamily: styleConfig.typography,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                      position: "relative",
                      transition: "all 0.3s ease"
                   }}>
                     <InlineStack align="space-between" blockAlign="center" wrap={false}>
                        <BlockStack gap="100">
                          <Text variant="bodyMd" fontWeight="bold" tone="inherit">🎁 {offerTitle || "Your Offer Title"}</Text>
                          <Text variant="bodyXs" tone="inherit" style={{ opacity: 0.8 }}>{description || "Add a description..."}</Text>
                        </BlockStack>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                           <div style={{
                             background: styleConfig.codeColor,
                             color: styleConfig.backgroundColor?.includes('white') || styleConfig.backgroundColor === '#ffffff' ? '#ffffff' : styleConfig.backgroundColor,
                             padding: "4px 10px", borderRadius: "4px", fontWeight: "800", fontFamily: "monospace", fontSize: `${styleConfig.fontSize}px`, letterSpacing: "1px", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)"
                           }}>{couponCode || "GIFT10"}</div>
                        </div>
                     </InlineStack>
                   </div>
                </div>
              </BlockStack>
            </Card>
            <Button variant="primary" size="large" fullWidth onClick={handleSubmit} loading={isLoading}>Save Offer</Button>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function ResourceScrollArea({ items, onRemove, idKey, titleKey }) {
  if (items.length === 0) return null;
  return (
    <Box padding="200" background="bg-surface-secondary" borderRadius="300" maxHeight="200px" style={{ overflowY: "auto" }}>
      <BlockStack gap="200">
        {items.map(item => (
          <Box key={item[idKey]} padding="200" background="bg-surface" borderRadius="200" border="1px solid #eee">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                {item.image && <Thumbnail source={item.image} size="small" />}
                <Text variant="bodySm" fontWeight="medium">{item[titleKey]}</Text>
              </InlineStack>
              <Button size="micro" variant="plain" tone="critical" onClick={() => onRemove(item[idKey])}>Remove</Button>
            </InlineStack>
          </Box>
        ))}
      </BlockStack>
    </Box>
  );
}
