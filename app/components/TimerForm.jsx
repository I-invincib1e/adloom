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

export function TimerForm({ timer, onSave, isLoading, disabled, onDirty }) {
  // --- State ---
  const [name, setName] = useState(timer?.name || "");
  
  // Force announcement bar defaults
  const ANNOUNCEMENT_DEFAULTS = {
    backgroundColor: "#000000",
    borderColor: "#000000",
    titleColor: "#ffffff",
    subtitleColor: "#cccccc",
    timerColor: "#ffffff",
    borderSize: 0,
    borderRadius: 0,
    padding: 10,
    fontSize: 15,
    typography: "Outfit",
    className: "rockit-timer-bar",
    cssSelector: "header, #shopify-section-header, .header-wrapper, .site-header",
    embedPosition: "after",
    layoutMode: "banner",
    preset: "announcement",
  };

  // Parse existing style/content JSON or set defaults
  const initialConfig = timer?.style
    ? { ...JSON.parse(timer.style), ...ANNOUNCEMENT_DEFAULTS, preset: "announcement" } // Merge to enforce announcement
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
        ...ANNOUNCEMENT_DEFAULTS
      };

  const [config, setConfig] = useState(initialConfig);
  const [selectedTab, setSelectedTab] = useState(0);

  const PRESETS = [
    {
      id: "standard",
      label: "Standard",
      config: {
        backgroundColor: "#000000",
        borderColor: "#000000",
        titleColor: "#ffffff",
        subtitleColor: "#cccccc",
        timerColor: "#ffffff",
        borderSize: 0,
        borderRadius: 0,
        typography: "Outfit",
      }
    },
    {
      id: "minimal",
      label: "Minimal", 
      config: {
        backgroundColor: "#ffffff",
        borderColor: "#e1e3e5",
        titleColor: "#202223",
        subtitleColor: "#6d7175",
        timerColor: "#202223",
        borderSize: 1,
        borderRadius: 0,
        typography: "Inter",
      }
    },
    {
      id: "urgent",
      label: "Urgent",
      config: {
        backgroundColor: "#d82c0d",
        borderColor: "#d82c0d",
        titleColor: "#ffffff",
        subtitleColor: "#fbeae5",
        timerColor: "#ffffff",
        borderSize: 0,
        borderRadius: 0,
        typography: "Roboto",
      }
    },
    {
      id: "midnight",
      label: "Midnight",
      config: {
        backgroundColor: "#1a1a1a",
        borderColor: "#333333",
        titleColor: "#4adbc8",
        subtitleColor: "#999999",
        timerColor: "#4adbc8",
        borderSize: 1,
        borderRadius: 4,
        typography: "Monospace",
      }
    }
  ];

  const [selectedPreset, setSelectedPreset] = useState("custom");

  const handlePresetChange = (presetId) => {
    setSelectedPreset(presetId);
    if (presetId === "custom") return;

    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setConfig(prev => ({
        ...prev,
        ...preset.config
      }));
      if (onDirty) onDirty();
    }
  };

  const handleConfigChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSelectedPreset("custom");
    if (onDirty) onDirty();
  };

  const handleLabelChange = (key, value) => {
    setConfig((prev) => ({
      ...prev,
      labels: { ...prev.labels, [key]: value },
    }));
    if (onDirty) onDirty();
  };

  const handleSubmit = () => {
    onSave({
      name,
      textTemplate: "",
      position: "header", // Internal flag, though actual placement is via CSS selector in config
      style: JSON.stringify(config),
    });
  };

  const tabs = [
    { id: "content", content: "Content" },
    { id: "style", content: "Style" },
  ];

  // Mock preview time
  const [timeLeft] = useState({ d: "02", h: "14", m: "30", s: "15" });

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
                value={(!value || value.includes('gradient')) ? "#ffffff" : value}
                onChange={(e) => onChange(e.target.value)}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
             />
          </div>
        }
      />
    </div>
  );

  const renderContentTab = () => (
    <BlockStack gap="400" className="animate-fade-in-up stagger-1">
      <TextField
        label="Internal Name"
        value={name}
        onChange={(v) => { setName(v); if(onDirty) onDirty(); }}
        autoComplete="off"
        maxLength={255}
        helpText="Only visible to you in the admin."
      />
      <Box paddingBlockStart="400">
        <Text variant="headingSm" as="h3">Display Text</Text>
      </Box>
      <FormLayout>
        <FormLayout.Group>
          <TextField label="Title" value={config.title} onChange={(v) => handleConfigChange("title", v)} autoComplete="off" />
          <TextField label="Subtitle" value={config.subtitle} onChange={(v) => handleConfigChange("subtitle", v)} autoComplete="off" />
        </FormLayout.Group>
      </FormLayout>

      <Box paddingBlockStart="400">
        <Text variant="headingSm" as="h3">Time Labels (Short)</Text>
      </Box>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <TextField label="Days" value={config.labels.days} onChange={(v) => handleLabelChange("days", v)} autoComplete="off" />
        <TextField label="Hours" value={config.labels.hours} onChange={(v) => handleLabelChange("hours", v)} autoComplete="off" />
        <TextField label="Minutes" value={config.labels.minutes} onChange={(v) => handleLabelChange("minutes", v)} autoComplete="off" />
        <TextField label="Seconds" value={config.labels.seconds} onChange={(v) => handleLabelChange("seconds", v)} autoComplete="off" />
      </div>
    </BlockStack>
  );



  const renderStyleTab = () => (
    <BlockStack gap="400" className="animate-fade-in-up">
      <Box>
        <Text as="h2" variant="headingSm">Design Presets</Text>
        <Box paddingBlockStart="200" paddingBlockEnd="400">
             <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PRESETS.map(preset => (
                  <Button 
                    key={preset.id} 
                    onClick={() => handlePresetChange(preset.id)} 
                    variant={selectedPreset === preset.id ? "primary" : "secondary"}
                  >
                    {preset.label}
                  </Button>
                ))}
                <Button 
                  onClick={() => handlePresetChange("custom")} 
                  variant={selectedPreset === "custom" ? "primary" : "secondary"}
                >
                  Custom
                </Button>
             </div>
        </Box>
        
        <Divider />
        <Box paddingBlockStart="400">
            <Text as="h2" variant="headingSm">Appearance</Text>
        </Box>
        <Box paddingBlockStart="200">
          <FormLayout>
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <ColorInput label="Background" value={config.backgroundColor} onChange={(v) => handleConfigChange("backgroundColor", v)} />
                <ColorInput label="Border" value={config.borderColor} onChange={(v) => handleConfigChange("borderColor", v)} />
                <ColorInput label="Title Color" value={config.titleColor} onChange={(v) => handleConfigChange("titleColor", v)} />
                <ColorInput label="Timer Color" value={config.timerColor} onChange={(v) => handleConfigChange("timerColor", v)} />
             </div>
             
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
               <Select label="Typography" options={["Inter", "Roboto", "Monospace", "Serif", "Outfit"].map(f => ({ label: f, value: f }))} value={config.typography || "Inter"} onChange={(v) => handleConfigChange("typography", v)} />
               <RangeSlider label="Font Size" value={config.fontSize} onChange={(v) => handleConfigChange("fontSize", v)} min={12} max={32} output />
               <RangeSlider label="Inner Padding" value={config.padding} onChange={(v) => handleConfigChange("padding", v)} min={0} max={50} output />
             </div>
          </FormLayout>
        </Box>
      </Box>
    </BlockStack>
  );

  return (
    <BlockStack gap="500">
      <InlineStack gap="400" align="start" blockAlign="start" wrap={false}>
        {/* --- Left Column: Configuration --- */}
        <div style={{ flex: 1 }}>
          <Card padding="0">
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <Box padding="500">
                {selectedTab === 0 && renderContentTab()}
                {selectedTab === 1 && renderStyleTab()}
              </Box>
            </Tabs>
          </Card>
        </div>

        {/* --- Right Column: Preview --- */}
        <div style={{ width: "100%", maxWidth: "450px", position: "sticky", top: "20px" }}>
          <BlockStack gap="400">
            <Card title="Live Banner Preview">
              <BlockStack gap="400">
                <Text variant="headingSm">Live Preview</Text>
                <div style={{ padding: "10px 0" }}>
                  <div
                    style={{
                      background: config.backgroundColor,
                      borderTop: `solid ${config.borderSize || 0}px ${config.borderColor}`,
                      borderBottom: `solid ${config.borderSize || 0}px ${config.borderColor}`,
                      padding: `${config.padding}px`,
                      color: config.titleColor,
                      fontFamily: config.typography || "Inter",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "16px",
                      width: "100%",
                      boxSizing: "border-box",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        <Text variant="bodyMd" fontWeight="bold" tone="inherit">{config.title || "Flash Sale!"}</Text>
                        <Text variant="bodyXs" tone="inherit" style={{ opacity: 0.8 }}>{config.subtitle}</Text>
                    </div>

                    <InlineStack gap="200" blockAlign="center">
                      {[
                        { val: timeLeft.d, label: config.labels.days },
                        { val: timeLeft.h, label: config.labels.hours },
                        { val: timeLeft.m, label: config.labels.minutes },
                        { val: timeLeft.s, label: config.labels.seconds },
                      ].map((item, i) => (
                        <div key={i} style={{ textAlign: "center", minWidth: "30px" }}>
                          <div style={{ fontSize: `${config.fontSize}px`, fontWeight: "800", color: config.timerColor, fontFamily: "monospace" }}>{item.val}</div>
                          <div style={{ fontSize: "9px", textTransform: "uppercase", opacity: 0.7 }}>{item.label}</div>
                        </div>
                      ))}
                    </InlineStack>
                  </div>
                </div>
              </BlockStack>
            </Card>
            <Button
              variant="primary"
              size="large"
              onClick={handleSubmit}
              loading={isLoading}
              fullWidth
              disabled={disabled}
            >
              Save Timer
            </Button>
          </BlockStack>
        </div>
      </InlineStack>
    </BlockStack>
  );
}
