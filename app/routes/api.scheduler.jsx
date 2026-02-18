import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { applySale, revertSale } from "../models/sale.server";
import { checkActiveSaleConstraint, checkVariantLimit } from "../models/billing.server";
import prisma from "../db.server";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  
  const now = new Date();

  // Find sales to start
  const salesToStart = await prisma.sale.findMany({
    where: {
      shop: session.shop, // Ensure we only look at this shop's sales
      status: "PENDING",
      startTime: { lte: now },
    },
  });

  for (const sale of salesToStart) {
    const items = sale.items || [];
    const variantIds = items.map(i => i.variantId);

    // 1. Check for product overlaps and timer consistency
    const { checkItemOverlaps } = await import("../models/sale.server");
    const overlapCheck = await checkItemOverlaps(session.shop, variantIds, sale.id, sale.startTime, sale.endTime, sale.timerId);
    if (!overlapCheck.ok) {
        console.log(`[Scheduler] Skipping sale "${sale.title}" (ID: ${sale.id}) activation: ${overlapCheck.message}`);
        continue;
    }

    // 2. Check global variant limit (Time-aware)
    const { checkGlobalVariantLimit } = await import("../models/billing.server");
    const variantLimitCheck = await checkGlobalVariantLimit(request, variantIds, sale.startTime, sale.endTime, sale.id);
    if (!variantLimitCheck.ok) {
        console.log(`[Scheduler] Skipping sale "${sale.title}" (ID: ${sale.id}) activation: ${variantLimitCheck.message}`);
        continue;
    }

    console.log(`Starting sale: ${sale.title}`);
    await applySale(sale.id, admin);
  }

  // Find sales to end
  const salesToEnd = await prisma.sale.findMany({
    where: {
      status: "ACTIVE",
      endTime: { lte: now },
    },
  });

  for (const sale of salesToEnd) {
    console.log(`Ending sale: ${sale.title}`);
    await revertSale(sale.id, admin);
  }

  return json({
    started: salesToStart.length,
    ended: salesToEnd.length,
    salesToStart: salesToStart.map(s => s.title),
    salesToEnd: salesToEnd.map(s => s.title),
  });
}
