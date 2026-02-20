try {
  require("../app/shopify.server");
  console.log("Shopify server initialized successfully");
  process.exit(0);
} catch (err) {
  console.error("Shopify server failed to initialize:", err);
  process.exit(1);
}
