import { Card, Text, BlockStack, List } from "@shopify/polaris";

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px" }}>
      <BlockStack gap="500">
        <Text as="h1" variant="heading2xl">Privacy Policy</Text>
        
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">1. Introduction</Text>
            <Text as="p" variant="bodyMd">
              This Privacy Policy describes how [Your App Name] ("the App", "we", "us", or "our") collects, uses, and discloses your Personal Information when you install or use the App in connection with your Shopify store.
            </Text>

            <Text as="h2" variant="headingLg">2. Information We Collect</Text>
            <Text as="p" variant="bodyMd">
              When you install the App, we are automatically able to access certain types of information from your Shopify account:
            </Text>
            <List type="bullet">
              <List.Item>Shopify account data (store name, email, domain)</List.Item>
              <List.Item>Product data (to enable sales and offers functionality)</List.Item>
              <List.Item>Customer data (only as required for targeted offers, if applicable)</List.Item>
            </List>

            <Text as="h2" variant="headingLg">3. How We Use Your Information</Text>
            <Text as="p" variant="bodyMd">
              We use the personal information we collect from you and your customers in order to provide the Service and to operate the App. This includes:
            </Text>
            <List type="bullet">
              <List.Item>Functionality: To enable features like countdown timers, sales offers, and coupons.</List.Item>
              <List.Item>Billing: To manage subscription plans via Shopify Billing API.</List.Item>
              <List.Item>Communication: To communicate with you about your account or the App.</List.Item>
            </List>

            <Text as="h2" variant="headingLg">4. Data Sharing</Text>
            <Text as="p" variant="bodyMd">
              We do not sell your personal data. We may share your Personal Information to comply with applicable laws and regulations, to respond to a subpoena, search warrant or other lawful request for information we receive, or to otherwise protect our rights.
            </Text>

            <Text as="h2" variant="headingLg">5. Your Rights (GDPR/CCPA)</Text>
            <Text as="p" variant="bodyMd">
              If you are a European resident, you have the right to access personal information we hold about you and to ask that your personal information be corrected, updated, or deleted. If you would like to exercise this right, please contact us through the contact information below.
            </Text>

            <Text as="h2" variant="headingLg">6. Contact Us</Text>
            <Text as="p" variant="bodyMd">
              For more information about our privacy practices, if you have questions, or if you would like to make a complaint, please contact us by e-mail at support@[your-domain].com.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </div>
  );
}
