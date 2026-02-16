import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.public.appProxy(request);
  const shop = session.shop;
  
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const rawProductId = url.searchParams.get("productId");

  console.log(`[Proxy Request] shop=${shop}, type=${type}, productId=${rawProductId}`);

  if (!rawProductId) {
    return json({ error: "Missing productId" }, { status: 400 });
  }

  const gid = rawProductId.startsWith("gid://") ? rawProductId : `gid://shopify/Product/${rawProductId}`;
  const numericId = rawProductId.replace("gid://shopify/Product/", "");

  // --- Coupon Offers ---
  if (type === "coupons") {
    const tags = url.searchParams.get("tags") || "";
    const vendor = url.searchParams.get("vendor") || "";
    
    const { getCouponsForProduct } = await import("../models/coupon.server");
    const coupons = await getCouponsForProduct(gid, { tags, vendor }, shop);

    return json({
      coupons: coupons.map((c) => ({
        offerTitle: c.offerTitle,
        couponCode: c.couponCode,
        description: c.description,
        style: c.style,
      }))
    });
  }

  // --- Timer (default) ---
  const now = new Date();
  const sales = await db.sale.findMany({
    where: {
      shop,
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

  return json({
    timer: saleWithTimer ? {
      ...saleWithTimer.timer,
      endTime: saleWithTimer.endTime,
    } : null
  });
}
