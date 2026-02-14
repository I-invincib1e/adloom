import { useState, useCallback } from "react";
import {
  FormLayout,
  TextField,
  Select,
  Card,
  Box,
  Text,
  BlockStack,
  InlineStack,
  Button,
  RangeSlider,
  Tabs,
  Divider,
  Banner,
} from "@shopify/polaris";

export function TimerForm({ timer, onSave, isLoading }) {
  // --- State ---
  const [name, setName] = useState(timer?.name || "");
  const [position, setPosition] = useState(timer?.position || "below_price");

  // Parse existing style/content JSON or set defaults
  const initialConfig = timer?.style
    ? JSON.parse(timer.style)
    : {
        // Content
        title: "Flash Sale Ends Soon!",
        subtitle: "Don't miss out on these deals",
        labels: {
          days: "D",
          hours: "H",
          minutes: "M",
          seconds: "S",
        },

        // Style (Banner Default)
        backgroundColor: "#000000",
        borderColor: "#000000",
        borderSize: 0,
        borderRadius: 0,
        titleColor: "#ffffff",
        subtitleColor: "#cccccc",
        timerColor: "#ffffff",
        padding: 12,
        fontSize: 16,
        layoutMode: "banner", // New flag for render
        preset: "bold",
      };

  const [config, setConfig] = useState(initialConfig);
  const [selectedTab, setSelectedTab] = useState(0);

  const handleConfigChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleLabelChange = (key, value) => {
    setConfig((prev) => ({
      ...prev,
      labels: { ...prev.labels, [key]: value },
    }));
  };

  const handleSubmit = () => {
    onSave({
      name,
      textTemplate: "",
      position,
      style: JSON.stringify(config),
    });
  };

  const tabs = [
    { id: "content", content: "Content" },
    { id: "style", content: "Style" },
    { id: "placement", content: "Placement" },
  ];

  // Mock preview time
  const [timeLeft] = useState({ d: "02", h: "14", m: "30", s: "15" });

  // --- Banner Presets ---
  const PRESETS = {
    standard: {
      backgroundColor: "#f4f6f8", // Light gray background
      borderColor: "#dbe1e6", // Subtle border
      borderSize: 1,
      borderRadius: 4,
      titleColor: "#202223",
      subtitleColor: "#6d7175",
      timerColor: "#202223",
      padding: 12,
      fontSize: 16,
    },
    gradient: {
      backgroundColor: "linear-gradient(90deg, #ff8a00, #e52e71)", 
      borderColor: "transparent",
      borderSize: 0,
      borderRadius: 8,
      titleColor: "#ffffff",
      subtitleColor: "rgba(255,255,255,0.9)",
      timerColor: "#ffffff",
      padding: 14,
      fontSize: 16,
      className: "rockit-timer-gradient",
    },
    glass: {
      backgroundColor: "rgba(255, 255, 255, 0.6)", // More opaque for visibility
      borderColor: "rgba(0, 0, 0, 0.05)",
      borderSize: 1,
      borderRadius: 12,
      titleColor: "#000000",
      subtitleColor: "#444",
      timerColor: "#000000",
      padding: 14,
      fontSize: 15,
      className: "rockit-timer-glass",
    },
    neon: {
      backgroundColor: "#000000",
      borderColor: "#0ff",
      borderSize: 1,
      borderRadius: 4,
      titleColor: "#0ff",
      subtitleColor: "#0cc",
      timerColor: "#fff",
      padding: 16,
      fontSize: 18,
      className: "rockit-timer-neon",
    },
    minimal: {
      backgroundColor: "#ffffff",
      borderColor: "#e1e3e5", // Add border to minimal so it has a boundary
      borderSize: 1,
      borderRadius: 4,
      titleColor: "#202223",
      subtitleColor: "#6d7175",
      timerColor: "#202223",
      padding: 10,
      fontSize: 14,
    },
  };

  const handlePresetChange = (presetKey) => {
    if (!PRESETS[presetKey]) return;
    const preset = PRESETS[presetKey];
    // Keep labels, overwrite styles
    setConfig((prev) => ({
      ...prev,
      ...preset,
      layoutMode: "banner",
      preset: presetKey,
      // If regular hex, set it. If gradient, we might need a separate field or logic.
      // For now, assume render handles 'linear-gradient' string in backgroundColor style.
    }));
  };

  // --- Color Picker Component ---
  const ColorInput = ({ label, value, onChange }) => (
    <div style={{ flex: 1 }}>
      <TextField
        label={label}
        value={value}
        onChange={onChange}
        autoComplete="off"
        prefix={
          <div style={{ position: "relative", width: 24, height: 24 }}>
             <div
               style={{
                 position: "absolute", inset: 0,
                 background: value?.includes('gradient') ? value : value,
                 borderRadius: 4,
                 border: "1px solid #ddd",
                 pointerEvents: "none",
               }}
             />
             <input
                type="color"
                value={(!value || value.includes('gradient')) ? "#ffffff" : value} // Fallback for gradients
                onChange={(e) => onChange(e.target.value)}
                style={{
                  position: "absolute", inset: 0,
                  opacity: 0,
                  cursor: "pointer",
                  width: "100%", height: "100%",
                  padding: 0, margin: 0, border: "none"
                }}
             />
          </div>
        }
      />
    </div>
  );

  // --- Render Tabs ---
  const renderContentTab = () => (
    <FormLayout>
      <TextField
        label="Internal Name"
        value={name}
        onChange={setName}
        autoComplete="off"
        maxLength={255}
        helpText="Only visible to you in the admin."
      />
      <Box paddingBlockStart="400">
        <Text variant="headingSm" as="h3">
          Display Text
        </Text>
      </Box>
      <FormLayout.Group>
        <TextField
          label="Title"
          value={config.title}
          onChange={(v) => handleConfigChange("title", v)}
          autoComplete="off"
        />
        <TextField
          label="Subtitle"
          value={config.subtitle}
          onChange={(v) => handleConfigChange("subtitle", v)}
          autoComplete="off"
        />
      </FormLayout.Group>

      <Box paddingBlockStart="400">
        <Text variant="headingSm" as="h3">
          Time Labels (Short)
        </Text>
      </Box>
      <FormLayout.Group>
        <TextField
          label="Days"
          value={config.labels.days}
          onChange={(v) => handleLabelChange("days", v)}
          autoComplete="off"
        />
        <TextField
          label="Hours"
          value={config.labels.hours}
          onChange={(v) => handleLabelChange("hours", v)}
          autoComplete="off"
        />
      </FormLayout.Group>
      <FormLayout.Group>
        <TextField
          label="Minutes"
          value={config.labels.minutes}
          onChange={(v) => handleLabelChange("minutes", v)}
          autoComplete="off"
        />
        <TextField
          label="Seconds"
          value={config.labels.seconds}
          onChange={(v) => handleLabelChange("seconds", v)}
          autoComplete="off"
        />
      </FormLayout.Group>
    </FormLayout>
  );

  const renderStyleTab = () => (
    <FormLayout>
        <Select
            label="Banner Preset"
            options={[
                { label: "Select a fascinating style...", value: "" },
                { label: "Standard (Grey)", value: "standard" },
                { label: "Sunset Gradient", value: "gradient" },
                { label: "Glassmorphism", value: "glass" },
                { label: "Cyber Neon", value: "neon" },
                { label: "Minimalist", value: "minimal" },
            ]}
            value={config.preset}
            onChange={handlePresetChange}
        />
      <Box paddingBlockStart="200">
        <Text variant="headingSm" as="h3">
          Colors & Background
        </Text>
      </Box>
      <FormLayout.Group>
        <ColorInput
          label="Background (or Gradient)"
          value={config.backgroundColor}
          onChange={(v) => handleConfigChange("backgroundColor", v)}
        />
        <ColorInput
          label="Border"
          value={config.borderColor}
          onChange={(v) => handleConfigChange("borderColor", v)}
        />
      </FormLayout.Group>
      <FormLayout.Group>
        <ColorInput
          label="Title Text"
          value={config.titleColor}
          onChange={(v) => handleConfigChange("titleColor", v)}
        />
        <ColorInput
          label="Timer Digits"
          value={config.timerColor}
          onChange={(v) => handleConfigChange("timerColor", v)}
        />
      </FormLayout.Group>

      <Box paddingBlockStart="400">
        <Text variant="headingSm" as="h3">
          Dimensions & Spacing
        </Text>
      </Box>
      <RangeSlider
        label="Border Width (px)"
        value={config.borderSize}
        onChange={(v) => handleConfigChange("borderSize", v)}
        min={0}
        max={10}
        output
      />
      <RangeSlider
        label="Corner Radius (px)"
        value={config.borderRadius}
        onChange={(v) => handleConfigChange("borderRadius", v)}
        min={0}
        max={20}
        output
      />
      <RangeSlider
        label="Inner Padding (px)"
        value={config.padding}
        onChange={(v) => handleConfigChange("padding", v)}
        min={0}
        max={50}
        output
      />
      <RangeSlider
        label="Font Size (px)"
        value={config.fontSize}
        onChange={(v) => handleConfigChange("fontSize", v)}
        min={12}
        max={32}
        output
      />
    </FormLayout>
  );

  // Parse placement config from style JSON
  const [cssSelector, setCssSelector] = useState(config.cssSelector || "");
  const [embedPosition, setEmbedPosition] = useState(config.embedPosition || "before"); // Default to before (like announcement bar)

  const renderPlacementTab = () => (
    <BlockStack gap="600">
      {/* --- App Block Section --- */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingMd">App Block (Recommended)</Text>
          <Text as="p" tone="subdued">
            Use the theme editor to drag and drop the Timer. For a banner effect, place it at the very top of the product page or in the Header section if supported.
          </Text>
          <Button
            fullWidth
            url="https://admin.shopify.com/themes/current/editor?context=apps"
            external
            target="_blank"
          >
            Open theme editor
          </Button>
        </BlockStack>
      </Card>

      {/* --- App Embed Section --- */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">App Embed (Advanced)</Text>
          <Text as="p" tone="subdued">
            Use a CSS selector to inject the banner. Common selectors: <code>body</code> (top of page), <code>header</code>, or <code>.product-form</code>.
          </Text>

          <Button
            url="https://admin.shopify.com/themes/current/editor?context=apps&activateAppId=timer-theme-extension"
            external
            target="_blank"
          >
            Activate App Embed
          </Button>

          <BlockStack gap="300">
            <TextField
              label="CSS Selector"
              labelHidden
              placeholder=".header-wrapper"
              value={cssSelector}
              onChange={(val) => {
                setCssSelector(val);
                handleConfigChange("cssSelector", val);
              }}
              autoComplete="off"
              monospaced
              helpText="Leave blank to rely on App Block."
            />
          </BlockStack>

          <Select
            label="Position"
            options={[
              { label: "Before element (Top)", value: "before" },
              { label: "After element (Bottom)", value: "after" },
              { label: "Inside (First child)", value: "first_child" },
              { label: "Inside (Last child)", value: "last_child" },
            ]}
            value={embedPosition}
            onChange={(val) => {
              setEmbedPosition(val);
              handleConfigChange("embedPosition", val);
            }}
          />
        </BlockStack>
      </Card>
    </BlockStack>
  );

  return (
    <BlockStack gap="500">
      <InlineStack gap="400" align="start" blockAlign="start">
        {/* --- Left Column: Configuration --- */}
        <div style={{ flex: 1, minWidth: "300px" }}>
          <Card padding="0">
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <Box padding="500" minHeight="400px">
                {selectedTab === 0 && renderContentTab()}
                {selectedTab === 1 && renderStyleTab()}
                {selectedTab === 2 && renderPlacementTab()}
              </Box>
            </Tabs>
          </Card>
        </div>

        {/* --- Right Column: Preview --- */}
        <div style={{ width: "100%", maxWidth: "600px", flexShrink: 0 }}>
          <BlockStack gap="400">
            <Card title="Live Banner Preview">
              <Box padding="800" background="bg-surface-secondary">
                 <div style={{ padding: "20px 0" }}>
                  {/* THE TIMER BANNER COMPONENT PREVIEW */}
                  <div
                    style={{
                      background: config.backgroundColor, // Supports gradients
                      border: `${config.borderSize}px solid ${config.borderColor}`,
                      borderRadius: `${config.borderRadius}px`,
                      padding: `${config.padding}px`,
                      textAlign: "left",
                      color: config.titleColor,
                      boxShadow: config.className?.includes('neon') ? "0 0 10px rgba(255,255,255,0.5)" : "0 4px 12px rgba(0,0,0,0.1)",
                      display: "flex",
                      flexDirection: "row", // Banner style
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "16px",
                      width: "100%",
                      boxSizing: "border-box",
                      backdropFilter: config.className?.includes('glass') ? "blur(10px)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        {config.title && (
                        <div
                            style={{
                            fontSize: `${config.fontSize}px`,
                            fontWeight: "bold",
                            color: config.titleColor,
                            fontFamily: "inherit",
                            marginBottom: "2px",
                            }}
                        >
                            {config.title}
                        </div>
                        )}
                        {config.subtitle && (
                        <div
                            style={{
                            fontSize: `${Math.max(10, config.fontSize * 0.75)}px`,
                            color: config.subtitleColor,
                            }}
                        >
                            {config.subtitle}
                        </div>
                        )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        color: config.timerColor,
                        alignItems: "center",
                      }}
                    >
                      {[
                        { val: timeLeft.d, label: config.labels.days },
                        { val: timeLeft.h, label: config.labels.hours },
                        { val: timeLeft.m, label: config.labels.minutes },
                        { val: timeLeft.s, label: config.labels.seconds },
                      ].map((item, i) => (
                        <div key={i} style={{ textAlign: "center", minWidth: "30px" }}>
                          <div
                            style={{
                              fontSize: `${config.fontSize * 1.5}px`,
                              fontWeight: "800",
                              lineHeight: 1,
                              fontVariantNumeric: "tabular-nums",
                              fontFamily: "monospace",
                            }}
                          >
                            {item.val}
                          </div>
                          <div
                            style={{
                              fontSize: "9px",
                              textTransform: "uppercase",
                              marginTop: "2px",
                              opacity: 0.8,
                              letterSpacing: "0.5px",
                            }}
                          >
                            {item.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Box>
            </Card>
            <Button
              variant="primary"
              size="large"
              onClick={handleSubmit}
              loading={isLoading}
              fullWidth
            >
              Save Timer
            </Button>
          </BlockStack>
        </div>
      </InlineStack>
    </BlockStack>
  );
}
