import { useState, useCallback, useEffect } from "react";
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
  LegacyCard,
  Tabs,
  Divider,
} from "@shopify/polaris";

export function TimerForm({ timer, onSave, isLoading }) {
  // --- State ---
  const [name, setName] = useState(timer?.name || "");
  const [position, setPosition] = useState(timer?.position || "below_price");
  
  // Parse existing style/content JSON or set defaults
  const initialConfig = timer?.style ? JSON.parse(timer.style) : {
    // Content
    title: "Limited time offer",
    subtitle: "Sale ends in:",
    labels: { days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds" },
    
    // Style
    backgroundColor: "#ffffff",
    borderColor: "#000000",
    borderSize: 0,
    borderRadius: 8,
    titleColor: "#000000",
    subtitleColor: "#000000",
    timerColor: "#000000",
    padding: 20,
    fontSize: 16,
  };

  const [config, setConfig] = useState(initialConfig);
  const [selectedTab, setSelectedTab] = useState(0);

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleLabelChange = (key, value) => {
    setConfig(prev => ({ ...prev, labels: { ...prev.labels, [key]: value } }));
  };

  const handleSubmit = () => {
    onSave({
      name,
      textTemplate: "", // Not used with new structure, but required by schema
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
  const [timeLeft, setTimeLeft] = useState({ d: "02", h: "14", m: "30", s: "15" });

  // --- Render Tabs ---
  const renderContentTab = () => (
    <BlockStack gap="400">
      <TextField label="Name (Internal)" value={name} onChange={setName} autoComplete="off" maxLength={255} />
      <Divider />
      <TextField label="Title" value={config.title} onChange={(v) => handleConfigChange("title", v)} autoComplete="off" />
      <TextField label="Subtitle" value={config.subtitle} onChange={(v) => handleConfigChange("subtitle", v)} autoComplete="off" />
      
      <Text variant="headingSm">Labels</Text>
      <InlineStack gap="300">
        <TextField label="Days" value={config.labels.days} onChange={(v) => handleLabelChange("days", v)} autoComplete="off" />
        <TextField label="Hours" value={config.labels.hours} onChange={(v) => handleLabelChange("hours", v)} autoComplete="off" />
      </InlineStack>
      <InlineStack gap="300">
        <TextField label="Minutes" value={config.labels.minutes} onChange={(v) => handleLabelChange("minutes", v)} autoComplete="off" />
        <TextField label="Seconds" value={config.labels.seconds} onChange={(v) => handleLabelChange("seconds", v)} autoComplete="off" />
      </InlineStack>
    </BlockStack>
  );

  const renderStyleTab = () => (
    <BlockStack gap="400">
      <Text variant="headingSm">Background</Text>
      <InlineStack gap="400" align="start">
          <div style={{ flex: 1 }}>
             <TextField 
                label="Color" 
                value={config.backgroundColor} 
                onChange={(v) => handleConfigChange("backgroundColor", v)} 
                autoComplete="off"
                prefix={<div style={{ width: 20, height: 20, background: config.backgroundColor, borderRadius: 2, border: "1px solid #ddd" }} />}
             />
          </div>
      </InlineStack>

      <Divider />
      <Text variant="headingSm">Border</Text>
      <InlineStack gap="400">
         <div style={{ flex: 1 }}>
            <TextField 
               label="Color" 
               value={config.borderColor} 
               onChange={(v) => handleConfigChange("borderColor", v)} 
               autoComplete="off"
               prefix={<div style={{ width: 20, height: 20, background: config.borderColor, borderRadius: 2, border: "1px solid #ddd" }} />}
            />
         </div>
      </InlineStack>
      <InlineStack gap="300">
         <TextField type="number" label="Size (px)" value={String(config.borderSize)} onChange={(v) => handleConfigChange("borderSize", Number(v))} autoComplete="off" />
         <TextField type="number" label="Radius (px)" value={String(config.borderRadius)} onChange={(v) => handleConfigChange("borderRadius", Number(v))} autoComplete="off" />
      </InlineStack>

      <Divider />
      <Text variant="headingSm">Typography</Text>
      <InlineStack gap="300">
          <TextField 
             label="Title Color" 
             value={config.titleColor} 
             onChange={(v) => handleConfigChange("titleColor", v)} 
             autoComplete="off"
             prefix={<div style={{ width: 20, height: 20, background: config.titleColor, borderRadius: 2, border: "1px solid #ddd" }} />}
          />
          <TextField 
             label="Timer Color" 
             value={config.timerColor} 
             onChange={(v) => handleConfigChange("timerColor", v)} 
             autoComplete="off"
             prefix={<div style={{ width: 20, height: 20, background: config.timerColor, borderRadius: 2, border: "1px solid #ddd" }} />}
          />
      </InlineStack>
      <RangeSlider label="Padding (px)" value={config.padding} onChange={(v) => handleConfigChange("padding", v)} min={0} max={60} output />
    </BlockStack>
  );

  const renderPlacementTab = () => (
    <BlockStack gap="400">
       <Select
          label="Position on Product Page"
          options={[
            {label: 'Below Price', value: 'below_price'},
            {label: 'Below Title', value: 'below_title'},
            {label: 'Above Add to Cart', value: 'above_atc'},
            {label: 'Fixed Bar (Top)', value: 'bar_top'},
            {label: 'Fixed Bar (Bottom)', value: 'bar_bottom'},
          ]}
          value={position}
          onChange={setPosition}
          helpText="This is where the timer will appear on your product page."
       />
    </BlockStack>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "start" }}>
      {/* --- Left Column: Configuration --- */}
      <BlockStack gap="400">
         <Card padding="0">
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
               <Box padding="400">
                 {selectedTab === 0 && renderContentTab()}
                 {selectedTab === 1 && renderStyleTab()}
                 {selectedTab === 2 && renderPlacementTab()}
               </Box>
            </Tabs>
         </Card>
         <Button variant="primary" size="large" onClick={handleSubmit} loading={isLoading} fullWidth>Save Timer</Button>
      </BlockStack>

      {/* --- Right Column: Preview --- */}
      <Card title="Preview">
        <BlockStack gap="500">
           {/* Mock Storefront Context */}
           <Box>
              <div style={{ width: '60%', height: '8px', background: '#e1e3e5', borderRadius: '4px', marginBottom: '8px' }}></div>
              <div style={{ width: '90%', height: '8px', background: '#f1f2f3', borderRadius: '4px', marginBottom: '24px' }}></div>
              
              {/* THE TIMER COMPONENT */}
              <div style={{
                 backgroundColor: config.backgroundColor,
                 border: `${config.borderSize}px solid ${config.borderColor}`,
                 borderRadius: `${config.borderRadius}px`,
                 padding: `${config.padding}px`,
                 textAlign: "center",
                 fontFamily: "-apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
                 boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
              }}>
                 {config.title && (
                   <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "4px", color: config.titleColor }}>
                     {config.title}
                   </div>
                 )}
                 {config.subtitle && (
                   <div style={{ fontSize: "14px", marginBottom: "12px", color: config.subtitleColor }}>
                     {config.subtitle}
                   </div>
                 )}
                 
                 <div style={{ display: "flex", justifyContent: "center", gap: "16px", color: config.timerColor }}>
                    {[
                      { val: timeLeft.d, label: config.labels.days },
                      { val: timeLeft.h, label: config.labels.hours },
                      { val: timeLeft.m, label: config.labels.minutes },
                      { val: timeLeft.s, label: config.labels.seconds }
                    ].map((item, i) => (
                       <div key={i} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "32px", fontWeight: "bold", lineHeight: 1 }}>{item.val}</div>
                          <div style={{ fontSize: "11px", textTransform: "uppercase", marginTop: "4px", opacity: 0.8 }}>{item.label}</div>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Add to Cart Mock */}
              <div style={{ marginTop: "24px" }}>
                 <div style={{ background: "#1c1c1c", color: "white", padding: "12px", textAlign: "center", borderRadius: "4px", fontWeight: "bold" }}>
                   Add to cart
                 </div>
              </div>
              <div style={{ marginTop: "12px", textAlign: "center", color: "#666", fontSize: "12px" }}>
                 The timer is automatically configured using the sale's end date.
              </div>
           </Box>
        </BlockStack>
      </Card>
    </div>
  );
}
