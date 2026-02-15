import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const PLAN_LIMITS = {
  Free: { sales: 1, coupons: 2, timers: 1 },
  Basic: { sales: 5, coupons: 5, timers: 5 },
  Growth: { sales: 20, coupons: 20, timers: 20 },
  Pro: { sales: Infinity, coupons: Infinity, timers: Infinity },
};

export async function getPlan(request) {
  const { billing } = await authenticate.admin(request);
  try {
    const billingCheck = await billing.require({
      plans: ["Basic", "Growth", "Pro"],
      isTest: true,
      onFailure: async () => Promise.resolve(null), // Don't redirect, just return null handling
    });
    
    // billing.require returns the subscription if valid
    // However, if we pass multiple plans, we need to know WHICH one.
    // The current shopify-app-remix doesn't easily tell us "which" plan passed if we check multiple.
    // So we typically check them individually or rely on `billing.check`.

    // Simpler approach: Check subscriptions via API or assume Free if require fails
    // But `billing.require` throws or redirects if failure.
    // Let's use `billing.check` if available, or just check the active subscriptions from DB if strictly needed,
    // but the standard way is:

    // 1. Check Pro
    try {
        await billing.require({ plans: ["Pro", "Pro Annual"], isTest: true, onFailure: () => Promise.reject("Not Pro") });
        return "Pro";
    } catch {}

    // 2. Check Growth
    try {
        await billing.require({ plans: ["Growth", "Growth Annual"], isTest: true, onFailure: () => Promise.reject("Not Growth") });
        return "Growth";
    } catch {}

    // 3. Check Basic
    try {
        await billing.require({ plans: ["Basic", "Basic Annual"], isTest: true, onFailure: () => Promise.reject("Not Basic") });
        return "Basic";
    } catch {}

    return "Free";
  } catch (error) {
    return "Free";
  }
}

export async function getPlanUsage(request) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const plan = await getPlan(request);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.Free;

  // Count active resources
  // Sales: status = ACTIVE
  const activeSales = await prisma.sale.count({
    where: { status: "ACTIVE" },
  });

  // Coupons: status = ACTIVE and endTime > now
  const activeCoupons = await prisma.coupon.count({
    where: {
      status: "ACTIVE",
      endTime: { gt: new Date() },
    },
  });

  // Timers: just count all for now, or maybe exclude some if needed?
  // Let's count all timers as "Active Timers" usually means "Created Timers" in this context unless we have a status.
  // Looking at Timer model, it handles UI elements, so usually "Created" is the metric.
  const activeTimers = await prisma.timer.count();

  return {
    plan,
    sales: { used: activeSales, limit: limits.sales },
    coupons: { used: activeCoupons, limit: limits.coupons },
    timers: { used: activeTimers, limit: limits.timers },
  };
}

export async function checkLimit(request, feature) {
  const usage = await getPlanUsage(request);
  const resourceUsage = usage[feature]; // feature: 'sales', 'coupons', 'timers'

  if (!resourceUsage) return true; // Unknown feature, allow (or block safe?)

  if (resourceUsage.limit === Infinity) return true;

  if (resourceUsage.used >= resourceUsage.limit) {
    return false;
  }

  return true;
}
