import { json, redirect } from "@remix-run/node";
import { useActionData, useNavigation, useSubmit } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { createTimer } from "../models/timer.server";
import { TimerForm } from "../components/TimerForm";
import { Page } from "@shopify/polaris";

export async function loader({ request }) {
  await authenticate.admin(request);
  return json({});
}

export async function action({ request }) {
  await authenticate.admin(request);
  const formData = await request.json(); // Use JSON submit
  
  await createTimer(formData);
  return redirect("/app/timers");
}

export default function NewTimerPage() {
  const submit = useSubmit();
  const nav = useNavigation();
  const isLoading = nav.state === "submitting";

  const handleSave = (data) => {
    submit(data, { method: "post", encType: "application/json" });
  };

  return (
    <Page title="Create timer" backAction={{ url: "/app/timers" }}>
      <TimerForm onSave={handleSave} isLoading={isLoading} />
    </Page>
  );
}
