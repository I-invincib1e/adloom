import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigation, useSubmit, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getTimer, updateTimer, deleteTimer, duplicateTimer } from "../models/timer.server";
import { checkLimit } from "../models/billing.server";
import { TimerForm } from "../components/TimerForm";
import { Page, Modal, Text, BlockStack } from "@shopify/polaris";
import { useState } from "react";

export async function loader({ request, params }) {
  await authenticate.admin(request);
  const timer = await getTimer(params.id);
  if (!timer) throw new Response("Not Found", { status: 404 });
  return json({ timer });
}

export async function action({ request, params }) {
  await authenticate.admin(request);
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    // Save/update timer
    const formData = await request.json();
    await updateTimer(params.id, formData);
    return redirect("/app/timers?success=true");
  }

  // Form data actions (duplicate / delete)
  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "duplicate") {
    const allowed = await checkLimit(request, "timers");
    if (!allowed) {
        return json({ errors: { base: "Limit reached" } }, { status: 403 });
    }
    const newTimer = await duplicateTimer(params.id);
    return redirect(`/app/timers/${newTimer.id}`);
  }

  if (actionType === "delete") {
    await deleteTimer(params.id);
    return redirect("/app/timers?deleted=true");
  }

  return json({ error: "Unknown action" }, { status: 400 });
}

export default function EditTimerPage() {
  const { timer } = useLoaderData();
  const submit = useSubmit();
  const nav = useNavigation();
  const navigate = useNavigate();
  const isLoading = nav.state === "submitting";

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleSave = (data) => {
    submit(data, { method: "post", encType: "application/json" });
  };

  const handleDuplicate = () => {
    submit({ action: "duplicate" }, { method: "post" });
  };

  const handleDelete = () => {
    submit({ action: "delete" }, { method: "post" });
    setDeleteModalOpen(false);
  };

  return (
    <Page
      title={timer.name}
      backAction={{ url: "/app/timers" }}
      secondaryActions={[
        {
          content: "Duplicate",
          onAction: handleDuplicate,
        },
        {
          content: "Delete timer",
          destructive: true,
          onAction: () => setDeleteModalOpen(true),
        },
      ]}
    >
      <TimerForm timer={timer} onSave={handleSave} isLoading={isLoading} />

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete timer"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: handleDelete,
        }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setDeleteModalOpen(false) },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="200">
            <Text as="p">Are you sure you want to delete "{timer.name}"? This cannot be undone.</Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
