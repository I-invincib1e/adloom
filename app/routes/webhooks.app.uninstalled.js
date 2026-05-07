export const action = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const db = (await import("../db.server")).default;
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`[Webhook] Received ${topic} for ${shop}`);

  // ─── IMPORTANT: Only delete the session, NOT the merchant's data ───────────
  // Shopify sends `shop/redact` 48 hours AFTER uninstall (only if not reinstalled).
  // That is the correct and compliant time to delete sales, coupons, and timers.
  // Deleting everything here means reinstalling merchants lose all their work.
  // ──────────────────────────────────────────────────────────────────────────
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
