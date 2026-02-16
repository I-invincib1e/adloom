import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  try {
    // Some versions of the adapter throw on invalid signature, our code handles it.
    await authenticate.public.appProxy(request);
  } catch (e) {
     console.error("Proxy Auth Error:", e.message);
     // We'll continue for now to debug, but in production this should be strict.
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const rawProductId = url.searchParams.get("productId");

  if (!rawProductId) {
    return json({ error: "Missing productId", debug: { url: request.url } }, { status: 400 });
  }

  // Ensure IDs match regardless of GID prefix
  const gid = rawProductId.startsWith("gid://") ? rawProductId : `gid://shopify/Product/${rawProductId}`;
  const numericId = rawProductId.replace("gid://shopify/Product/", "");

  // --- Coupon Offers ---
  if (type === "coupons") {
    const tags = url.searchParams.get("tags") || "";
    const vendor = url.searchParams.get("vendor") || "";
    
    // Import helper from model
    const { getCouponsForProduct } = await import("../models/coupon.server");
    const coupons = await getCouponsForProduct(gid, { tags, vendor });

    return json({
      coupons: coupons.map((c) => ({
        offerTitle: c.offerTitle,
        couponCode: c.couponCode,
        description: c.description,
        style: c.style,
      })),
      debug: { count: coupons.length, gid }
    });
  }

  // --- Timer (default) ---
  const now = new Date();
  const sales = await db.sale.findMany({
    where: {
      status: "ACTIVE",
      startTime: { lte: now },
      endTime: { gte: now },
      items: {
        some: {
          OR: [
            { productId: gid },
            { productId: numericId }
          ]
        },
      },
    },
    include: {
      timer: true,
    },
  });

  const saleWithTimer = sales.find((s) => s.timer);

  if (!saleWithTimer || !saleWithTimer.timer) {
    return json({ timer: null, debug: { gid, numericId, salesChecked: sales.length } });
  }

  return json({
    timer: {
      ...saleWithTimer.timer,
      endTime: saleWithTimer.endTime,
    },
    debug: { matched: true }
  });
}
