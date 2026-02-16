import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const rawProductId = url.searchParams.get("productId");

  console.log(`[Proxy Request] type=${type}, productId=${rawProductId}`);

  try {
    // Attempt authentication but don't block yet while debugging
    await authenticate.public.appProxy(request);
  } catch (e) {
    console.error("Proxy Auth Check Error (Debugging):", e.message);
  }

  if (!rawProductId) {
    return json({ error: "Missing productId", debug: { url: request.url } }, { status: 400 });
  }

  const gid = rawProductId.startsWith("gid://") ? rawProductId : `gid://shopify/Product/${rawProductId}`;
  const numericId = rawProductId.replace("gid://shopify/Product/", "");

  // Diagnostics: Check total counts in DB
  const totalSales = await db.sale.count();
  const activeSales = await db.sale.count({ where: { status: "ACTIVE" } });
  const totalCoupons = await db.coupon.count();

  // --- Coupon Offers ---
  if (type === "coupons") {
    const tags = url.searchParams.get("tags") || "";
    const vendor = url.searchParams.get("vendor") || "";
    
    const { getCouponsForProduct } = await import("../models/coupon.server");
    const coupons = await getCouponsForProduct(gid, { tags, vendor });

    return json({
      coupons: coupons.map((c) => ({
        offerTitle: c.offerTitle,
        couponCode: c.couponCode,
        description: c.description,
        style: c.style,
      })),
      debug: { 
        count: coupons.length, 
        gid, 
        totalCouponsInDb: totalCoupons,
        activeCriteria: { tags, vendor }
      }
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

  return json({
    timer: saleWithTimer ? {
      ...saleWithTimer.timer,
      endTime: saleWithTimer.endTime,
    } : null,
    debug: { 
      matched: !!saleWithTimer, 
      gid, 
      numericId, 
      dbStats: { totalSales, activeSales },
      now: now.toISOString()
    }
  });
}
