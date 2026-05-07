import { redirect } from "@remix-run/node";

/**
 * Unauthenticated billing return bounce route.
 *
 * After a merchant approves/declines a charge, Shopify redirects the
 * TOP-LEVEL browser window to the returnUrl we gave billing.request().
 *
 * Problem: If we point returnUrl at /app/pricing, authenticate.admin()
 * fires without a session token (because we're outside the Shopify
 * Admin iframe) → /auth/login → "refused to connect" errors.
 *
 * Solution: This route lives OUTSIDE the /app tree (no auth required).
 * It reads the `shop` param and bounces the browser into the Shopify
 * Admin embedded app URL, which re-enters the iframe properly and
 * App Bridge provides the session token automatically.
 */
export async function loader({ request }) {
  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop") || "";
  const plan = url.searchParams.get("plan") || "";
  const upgraded = url.searchParams.get("upgraded") || "true";

  if (!shopParam) {
    // Fallback: if somehow shop is missing, send them to the root
    return redirect("/");
  }

  // Build the proper Shopify Admin embedded app URL.
  // Format: https://{shop}/admin/apps/{client_id}/path
  // This is the legacy (but universally supported) admin URL format.
  // Using the client_id as the app identifier works reliably here.
  const clientId = "771263eab41b997e2f158c98a9dd728b";
  const adminUrl = `https://${shopParam}/admin/apps/${clientId}/app/pricing?upgraded=${upgraded}&plan=${encodeURIComponent(plan)}`;

  console.log(`[Billing Return] Bouncing to: ${adminUrl}`);
  return redirect(adminUrl);
}

export default function BillingReturn() {
  // This should never render — the loader always redirects.
  // But just in case, show a loading state.
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "system-ui" }}>
      <p>Redirecting you back to the app...</p>
    </div>
  );
}
