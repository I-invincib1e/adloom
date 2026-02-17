import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const PLAN_LIMITS = {
  Free: { variants: 50, timers: 1 },
  Starter: { variants: 2000, timers: 5 },
  Plus: { variants: 20000, timers: 100 },
  Professional: { variants: Infinity, timers: Infinity },
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
    if (name.includes("professional")) return "Professional";
    if (name.includes("plus")) return "Plus";
    if (name.includes("starter")) return "Starter";
    
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

  // Count active variants on sale
  const activeVariants = await prisma.saleItem.count({
    where: {
      sale: {
        shop,
        status: "ACTIVE",
      },
    },
  });

  // Count active timers
  const activeTimers = await prisma.timer.count({
    where: { shop }
  });

  return {
    plan,
    variants: { used: activeVariants, limit: limits.variants },
    timers: { used: activeTimers, limit: limits.timers },
  };
}

export async function checkLimit(request, feature) {
  const usage = await getPlanUsage(request);
  const resourceUsage = usage[feature]; // feature: 'variants', 'timers'

  if (!resourceUsage) return true;

  if (resourceUsage.limit === Infinity) return true;

  if (resourceUsage.used >= resourceUsage.limit) {
    return false;
  }

  return true;
}
