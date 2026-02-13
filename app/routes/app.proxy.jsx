import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getTimers } from "../models/timer.server";
import { getSales } from "../models/sale.server";
import db from "../db.server";

export async function loader({ request }) {
  const { liquid } = await authenticate.public.appProxy(request);

  if (!liquid) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  if (!productId) {
    return json({ error: "Missing productId" }, { status: 400 });
  }

  // Find active sales containing this product
  // This is complex because products can be in sales via tags/collections/vendors.
  // For V1, let's look for exact match in SaleItem.
  // But wait, our SaleItem model stores `productId`.
  
  // Find active sales
  const now = new Date();
  const sales = await db.sale.findMany({
    where: {
      status: "ACTIVE",
      startTime: { lte: now },
      endTime: { gte: now },
      items: {
        some: {
          productId: `gid://shopify/Product/${productId}`
        }
      }
    },
    include: {
      timer: true 
    }
  });

  // If multiple sales, pick the one with a timer
  const saleWithTimer = sales.find(s => s.timer);
  
  if (!saleWithTimer || !saleWithTimer.timer) {
    return json({ timer: null });
  }

  return json({
    timer: {
      ...saleWithTimer.timer,
      endTime: saleWithTimer.endTime,
    }
  });
}
