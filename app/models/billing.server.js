import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const PLAN_LIMITS = {
  Free: { sales: 1, coupons: 2, timers: 1 },
  Basic: { sales: 5, coupons: 5, timers: 5 },
  Growth: { sales: 20, coupons: 20, timers: 20 },
  Pro: { sales: Infinity, coupons: Infinity, timers: Infinity },
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
            test
          }
        }
      }
    `);

    const data = await response.json();
    const subscriptions = data?.data?.appInstallation?.activeSubscriptions || [];
    
    // Find the first active subscription that matches our expected plan names
    // Note: In Managed Pricing, the name is what you set in the Partner Dashboard
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

  // Count active resources
  // Sales: status = ACTIVE
  const activeSales = await prisma.sale.count({
    where: { shop, status: "ACTIVE" },
  });

  // Coupons: status = ACTIVE and endTime > now
  const activeCoupons = await prisma.coupon.count({
    where: {
      shop,
      status: "ACTIVE",
      endTime: { gt: new Date() },
    },
  });

  // Timers: just count all for now, or maybe exclude some if needed?
  const activeTimers = await prisma.timer.count({
    where: { shop }
  });

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
