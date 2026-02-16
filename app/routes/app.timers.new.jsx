import { json, redirect } from "@remix-run/node";
import { useActionData, useNavigation, useSubmit, useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { checkLimit } from "../models/billing.server";
import { createTimer } from "../models/timer.server";
import { TimerForm } from "../components/TimerForm";
import { Page, Layout, Banner, Button } from "@shopify/polaris";

export async function loader({ request }) {
  await authenticate.admin(request);
  const allowed = await checkLimit(request, "timers");
  return json({ allowed });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const allowed = await checkLimit(request, "timers");
  if (!allowed) {
      return json({ errors: { base: "Limit reached" } }, { status: 403 });
  }
  const formData = await request.json(); // Use JSON submit
  
  await createTimer(formData, session.shop);
  return redirect("/app/timers?success=true");
}

export default function NewTimerPage() {
  const submit = useSubmit();
  const nav = useNavigation();
  const { allowed } = useLoaderData();
  const isLoading = nav.state === "submitting";

  const handleSave = (data) => {
    submit(data, { method: "post", encType: "application/json" });
  };

  return (
    <Page title="Create timer" backAction={{ url: "/app/timers" }}>
      {!allowed && (
        <Layout>
          <Layout.Section>
            <Banner tone="warning" title="Limit Reached">
              <p>You have reached the limit of active timers for your current plan. <Button variant="plain" url="/app/pricing">Upgrade now</Button> to create more.</p>
            </Banner>
          </Layout.Section>
        </Layout>
      )}
      <TimerForm onSave={handleSave} isLoading={isLoading} disabled={!allowed} />
    </Page>
  );
}
