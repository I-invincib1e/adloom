import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const PLAN_LIMITS = {
  Free: { variants: 50, activeCoupons: 5, timers: 2, design: false, maxSales: 1 },
  Basic: { variants: 500, activeCoupons: 25, timers: 10, design: false, maxSales: Infinity },
  Growth: { variants: 1000, activeCoupons: Infinity, timers: Infinity, design: true, maxSales: Infinity },
  Pro: { variants: Infinity, activeCoupons: Infinity, timers: Infinity, design: true, maxSales: Infinity },
};

export async function getPlan(request) {
  const { admin } = await authenticate.admin(request);
  
  try {
    const response = await admin.graphql(`
      query getSubscriptions {
        appInstallation {
          activeSubscriptions {
            name
            status
          }
        }
      }
    `);

    const data = await response.json();
    const subscriptions = data?.data?.appInstallation?.activeSubscriptions || [];
    const activeSub = subscriptions.find(sub => sub.status === "ACTIVE");
    
    if (!activeSub) return "Free";

    const name = activeSub.name.toLowerCase();
    if (name.includes("pro")) return "Pro";
    if (name.includes("growth")) return "Growth";
    if (name.includes("basic")) return "Basic";
    
    return "Free";
  } catch (error) {
    console.error("Error fetching plan via GraphQL:", error);
    return "Free";
  }
}

export async function getPlanUsage(request) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const plan = await getPlan(request);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.Free;

  // Get total unique variants across ALL active sales
  const activeSales = await prisma.sale.findMany({
    where: { shop, status: "ACTIVE" },
    include: { items: true }
  });
  
  const seenVariants = new Set();
  activeSales.forEach(sale => {
    (sale.items || []).forEach(item => {
      if (item.variantId) seenVariants.add(item.variantId);
    });
  });
  
  const variantCount = seenVariants.size;

  const activeCoupons = await prisma.coupon.count({
    where: {
      shop,
      status: "ACTIVE",
      endTime: { gt: new Date() },
    },
  });

  const activeTimers = await prisma.timer.count({
    where: { shop }
  });

  // Get total sales (active and scheduled)
  const allSales = await prisma.sale.findMany({
    where: { shop, status: { in: ["ACTIVE", "PENDING"] } }
  });

  return {
    plan,
    totalSales: { used: allSales.length, limit: limits.maxSales },
    activeSales: { used: activeSales.length, limit: Infinity },
    variants: { used: variantCount, limit: limits.variants },
    coupons: { used: activeCoupons, limit: limits.activeCoupons },
    timers: { used: activeTimers, limit: limits.timers },
  };
}

export async function checkLimit(request, feature) {
  const usage = await getPlanUsage(request);
  const resourceUsage = usage[feature]; 

  if (!resourceUsage) return true;

  if (resourceUsage.limit === Infinity) return true;

  if (resourceUsage.used >= resourceUsage.limit) {
    return false;
  }

  return true;
}

/**
 * Validates if adding a set of variants to the pool exceeds the plan limit for a specific time window.
 * @param {Request} request 
 * @param {string[]} newVariantIds - Variants being activated or updated in a sale
 * @param {Date} targetStartTime - Start time of the sale
 * @param {Date} targetEndTime - End time of the sale
 * @param {string} currentSaleId - ID of the sale being updated (to exclude its current database items)
 */
export async function checkGlobalVariantLimit(request, newVariantIds, targetStartTime, targetEndTime, currentSaleId = null) {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const usage = await getPlanUsage(request);
    const limit = usage.variants.limit;
    
    if (limit === Infinity) return { ok: true };

    const start = new Date(targetStartTime);
    const end = new Date(targetEndTime);

    // Find all sales that overlap this target window
    const overlappingSales = await prisma.sale.findMany({
      where: { 
        shop, 
        status: { in: ["ACTIVE", "PENDING"] },
        NOT: currentSaleId ? { id: currentSaleId } : undefined,
        // Exclusive overlap logic
        startTime: { lt: end },
        endTime: { gt: start },
      },
      include: { items: true }
    });

    const activeVariants = new Set();
    overlappingSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        if (item.variantId) activeVariants.add(item.variantId);
      });
    });

    // Add the new variants to the set to find the total unique count
    newVariantIds.forEach(vid => activeVariants.add(vid));

    const totalCount = activeVariants.size;
    
    if (totalCount > limit) {
        return { 
          ok: false, 
          message: `Plan Limit Reached: This sale contains ${totalCount} unique products, which exceeds your plan's limit of ${limit}. Please upgrade or remove some items.` 
        };
    }
    return { ok: true };
}

export async function checkDesignLimit(request) {
    const plan = await getPlan(request);
    // Growth and Pro allow custom designs
    if (plan === "Growth" || plan === "Pro") return true; 
    return false;
}
