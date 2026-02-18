export const action = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const db = (await import("../db.server")).default;
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  // Comprehensive cleanup
  await db.sale.deleteMany({ where: { shop } });
  await db.coupon.deleteMany({ where: { shop } });
  await db.timer.deleteMany({ where: { shop } });

  return new Response();
};
