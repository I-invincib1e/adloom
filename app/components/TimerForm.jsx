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
        title: "Limited time offer",
        subtitle: "Sale ends in:",
        labels: {
          days: "Days",
          hours: "Hours",
          minutes: "Minutes",
          seconds: "Seconds",
        },

        // Style
        backgroundColor: "#ffffff",
        borderColor: "#000000",
        borderSize: 1,
        borderRadius: 8,
        titleColor: "#000000",
        subtitleColor: "#666666",
        timerColor: "#000000",
        padding: 16,
        fontSize: 16,
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
          Time Labels
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
      <Box paddingBlockStart="200">
        <Text variant="headingSm" as="h3">
          Colors & Background
        </Text>
      </Box>
      <FormLayout.Group>
        <TextField
          label="Background"
          value={config.backgroundColor}
          onChange={(v) => handleConfigChange("backgroundColor", v)}
          autoComplete="off"
          prefix={
            <div
              style={{
                width: 24,
                height: 24,
                background: config.backgroundColor,
                borderRadius: 4,
                border: "1px solid #ddd",
              }}
            />
          }
        />
        <TextField
          label="Border"
          value={config.borderColor}
          onChange={(v) => handleConfigChange("borderColor", v)}
          autoComplete="off"
          prefix={
            <div
              style={{
                width: 24,
                height: 24,
                background: config.borderColor,
                borderRadius: 4,
                border: "1px solid #ddd",
              }}
            />
          }
        />
      </FormLayout.Group>
      <FormLayout.Group>
        <TextField
          label="Title Text"
          value={config.titleColor}
          onChange={(v) => handleConfigChange("titleColor", v)}
          autoComplete="off"
          prefix={
            <div
              style={{
                width: 24,
                height: 24,
                background: config.titleColor,
                borderRadius: 4,
                border: "1px solid #ddd",
              }}
            />
          }
        />
        <TextField
          label="Timer Digits"
          value={config.timerColor}
          onChange={(v) => handleConfigChange("timerColor", v)}
          autoComplete="off"
          prefix={
            <div
              style={{
                width: 24,
                height: 24,
                background: config.timerColor,
                borderRadius: 4,
                border: "1px solid #ddd",
              }}
            />
          }
        />
      </FormLayout.Group>

      <Box paddingBlockStart="400">
        <Text variant="headingSm" as="h3">
          Dimensions
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
    </FormLayout>
  );

  const renderPlacementTab = () => (
    <FormLayout>
      <Select
        label="Position on Product Page"
        options={[
          { label: "Below Price", value: "below_price" },
          { label: "Below Title", value: "below_title" },
          { label: "Above Add to Cart", value: "above_atc" },
          { label: "Fixed Bar (Top)", value: "bar_top" },
          { label: "Fixed Bar (Bottom)", value: "bar_bottom" },
        ]}
        value={position}
        onChange={setPosition}
        helpText="Choose where the timer appears on your product pages."
      />
    </FormLayout>
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
        <div style={{ width: "380px", flexShrink: 0 }}>
          <BlockStack gap="400">
            <Card title="Live Preview">
              <Box padding="400">
                <BlockStack gap="400">
                  {/* Mock Product Context */}
                  <BlockStack gap="200">
                    <div
                      style={{
                        width: "100%",
                        height: "200px",
                        background: "#f4f4f4",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#aaa",
                        fontSize: "24px",
                      }}
                    >
                      📷
                    </div>
                    <div
                      style={{
                        width: "70%",
                        height: "12px",
                        background: "#e3e3e3",
                        borderRadius: "4px",
                      }}
                    ></div>
                    <div
                      style={{
                        width: "40%",
                        height: "12px",
                        background: "#e3e3e3",
                        borderRadius: "4px",
                      }}
                    ></div>
                  </BlockStack>

                  <Divider />

                  {/* THE TIMER COMPONENT PREVIEW */}
                  <div
                    style={{
                      backgroundColor: config.backgroundColor,
                      border: `${config.borderSize}px solid ${config.borderColor}`,
                      borderRadius: `${config.borderRadius}px`,
                      padding: `${config.padding}px`,
                      textAlign: "center",
                      color: config.titleColor,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                  >
                    {config.title && (
                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: "bold",
                          marginBottom: "4px",
                          color: config.titleColor,
                        }}
                      >
                        {config.title}
                      </div>
                    )}
                    {config.subtitle && (
                      <div
                        style={{
                          fontSize: "13px",
                          marginBottom: "12px",
                          color: config.subtitleColor,
                        }}
                      >
                        {config.subtitle}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "12px",
                        color: config.timerColor,
                      }}
                    >
                      {[
                        { val: timeLeft.d, label: config.labels.days },
                        { val: timeLeft.h, label: config.labels.hours },
                        { val: timeLeft.m, label: config.labels.minutes },
                        { val: timeLeft.s, label: config.labels.seconds },
                      ].map((item, i) => (
                        <div key={i} style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: "24px",
                              fontWeight: "800",
                              lineHeight: 1,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {item.val}
                          </div>
                          <div
                            style={{
                              fontSize: "10px",
                              textTransform: "uppercase",
                              marginTop: "4px",
                              opacity: 0.8,
                            }}
                          >
                            {item.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button variant="primary" fullWidth>
                    Add to cart
                  </Button>
                </BlockStack>
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
