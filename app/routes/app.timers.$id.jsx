import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getTimer, updateTimer } from "../models/timer.server";
import { TimerForm } from "../components/TimerForm";
import { Page } from "@shopify/polaris";

export async function loader({ request, params }) {
  await authenticate.admin(request);
  const timer = await getTimer(params.id);
  if (!timer) throw new Response("Not Found", { status: 404 });
  return json({ timer });
}

export async function action({ request, params }) {
  await authenticate.admin(request);
  const formData = await request.json();
  await updateTimer(params.id, formData);
  return redirect("/app/timers");
}

export default function EditTimerPage() {
  const { timer } = useLoaderData();
  const submit = useSubmit();
  const nav = useNavigation();
  const isLoading = nav.state === "submitting";

  const handleSave = (data) => {
    submit(data, { method: "post", encType: "application/json" });
  };

  return (
    <Page title="Edit timer" backAction={{ url: "/app/timers" }}>
      <TimerForm timer={timer} onSave={handleSave} isLoading={isLoading} />
    </Page>
  );
}
