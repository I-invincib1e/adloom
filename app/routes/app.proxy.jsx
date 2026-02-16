import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { liquid } = await authenticate.public.appProxy(request);

  if (!liquid) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const productId = url.searchParams.get("productId");

  if (!productId) {
    return json({ error: "Missing productId" }, { status: 400 });
  }

  // --- Coupon Offers ---
  if (type === "coupons") {
    const tags = url.searchParams.get("tags") || "";
    const vendor = url.searchParams.get("vendor") || "";
    
    const gid = productId.startsWith("gid://") ? productId : `gid://shopify/Product/${productId}`;
    
    // Import helper from model
    const { getCouponsForProduct } = await import("../models/coupon.server");
    const coupons = await getCouponsForProduct(gid, { tags, vendor });

    return json({
      coupons: coupons.map((c) => ({
        offerTitle: c.offerTitle,
        couponCode: c.couponCode,
        description: c.description,
        style: c.style, // Pass the whole style JSON/String
      })),
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
          productId: `gid://shopify/Product/${productId}`,
        },
      },
    },
    include: {
      timer: true,
    },
  });

  const saleWithTimer = sales.find((s) => s.timer);

  if (!saleWithTimer || !saleWithTimer.timer) {
    return json({ timer: null });
  }

  return json({
    timer: {
      ...saleWithTimer.timer,
      endTime: saleWithTimer.endTime,
    },
  });
}
