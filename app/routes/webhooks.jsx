import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  try {
    const { topic, shop, session, admin, payload } = await authenticate.webhook(request);
    console.log(`[Webhook] Received ${topic} for shop ${shop}`);

    switch (topic) {
      case "APP_UNINSTALLED":
        if (session) {
          await db.session.deleteMany({ where: { shop } });
        }
        await db.sale.deleteMany({ where: { shop } });
        await db.coupon.deleteMany({ where: { shop } });
        await db.timer.deleteMany({ where: { shop } });
        break;

      case "CUSTOMERS_DATA_REQUEST":
      case "CUSTOMERS_REDACT":
      case "SHOP_REDACT":
        console.log(`[GDPR] Processing ${topic} for ${shop}`);
        break;
        
      default:
        console.log(`[Webhook] Unhandled topic: ${topic}`);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error(`[Webhook] Error handling webhook:`, error);
    if (error instanceof Response) return error;
    return new Response("Webhook error", { status: 500 });
  }
};
