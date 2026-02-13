import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getTimers, deleteTimer } from "../models/timer.server";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Button,
  Text,
  EmptyState,
  InlineStack,
  Badge,
} from "@shopify/polaris";

export async function loader({ request }) {
  await authenticate.admin(request);
  const timers = await getTimers();
  return json({ timers });
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const id = formData.get("id");
  
  if (formData.get("action") === "delete") {
     await deleteTimer(id);
  }
  
  return json({ success: true });
}

export default function TimersPage() {
  const { timers } = useLoaderData();
  const navigate = useNavigate();
  const submit = useSubmit();

  const rowMarkup = timers.map(
    ({ id, name, position, textTemplate, updatedAt }, index) => (
      <IndexTable.Row id={id} key={id} position={index}>
        <IndexTable.Cell>
          <Text fontWeight="bold" as="span">{name}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{position}</IndexTable.Cell>
        <IndexTable.Cell>
           <Text tone="subdued">{textTemplate}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
           <div style={{ display: 'flex', gap: '8px' }}>
             <Button size="micro" onClick={() => navigate(`/app/timers/${id}`)}>Edit</Button>
             <Button size="micro" tone="critical" onClick={() => submit({ action: "delete", id }, { method: "post" })}>Delete</Button>
           </div>
        </IndexTable.Cell>
      </IndexTable.Row>
    )
  );

  const emptyStateMarkup = (
    <EmptyState
      heading="Create your first countdown timer"
      action={{
        content: "Create Timer",
        onAction: () => navigate("/app/timers/new"),
      }}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>Drive urgency and increase conversions with countdown timers.</p>
    </EmptyState>
  );

  return (
    <Page
      title="Timers"
      primaryAction={{
        content: "Create Timer",
        onAction: () => navigate("/app/timers/new"),
      }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {timers.length === 0 ? (
              emptyStateMarkup
            ) : (
              <IndexTable
                resourceName={{ singular: "timer", plural: "timers" }}
                itemCount={timers.length}
                headings={[
                  { title: "Name" },
                  { title: "Position" },
                  { title: "Template" },
                  { title: "Actions" },
                ]}
                selectable={false}
              >
                {rowMarkup}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
