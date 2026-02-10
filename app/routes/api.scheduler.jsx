import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { applySale, revertSale } from "../models/sale.server";
import prisma from "../db.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  
  const now = new Date();

  // Find sales to start
  const salesToStart = await prisma.sale.findMany({
    where: {
      status: "PENDING",
      startTime: { lte: now },
    },
  });

  for (const sale of salesToStart) {
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
