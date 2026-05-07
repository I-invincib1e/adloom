const { strict: assert } = require('assert');

// MOCK DATA
const scenarios = [
  {
    name: "1. Product has price only (1000, null)",
    item: { id: "item1", variantId: "var1", productId: "prod1" },
    variantData: { price: "1000.00", compareAtPrice: null },
    sale: { discountStrategy: "COMPARE_AT", discountType: "PERCENTAGE", value: 10 },
  },
  {
    name: "2. Product already has compare-at price (1000, 1200)",
    item: { id: "item2", variantId: "var2", productId: "prod2" },
    variantData: { price: "1000.00", compareAtPrice: "1200.00" },
    sale: { discountStrategy: "COMPARE_AT", discountType: "PERCENTAGE", value: 10 },
  },
  {
    name: "3. Merchant manually edits price (1000, null)",
    item: { id: "item3", variantId: "var3", productId: "prod3" },
    variantData: { price: "1000.00", compareAtPrice: null },
    sale: { discountStrategy: "COMPARE_AT", discountType: "PERCENTAGE", value: 10 },
    manualChangeDuringSale: "800.00"
  },
  {
    name: "4. Discount based on compare-at strategy (Fixed Amount on 1000, 1200)",
    item: { id: "item4", variantId: "var4", productId: "prod4" },
    variantData: { price: "1000.00", compareAtPrice: "1200.00" },
    sale: { discountStrategy: "COMPARE_AT", discountType: "FIXED_AMOUNT", value: 150 },
  },
  {
    name: "5. Merchant manually edits compare-at price (1000, 1200)",
    item: { id: "item5", variantId: "var5", productId: "prod5" },
    variantData: { price: "1000.00", compareAtPrice: "1200.00" },
    sale: { discountStrategy: "COMPARE_AT", discountType: "PERCENTAGE", value: 10 },
    manualCompareAtChangeDuringSale: "1500.00"
  }
];

// RUN TESTS
console.log("=== RUNNING PRICING SAFETY TESTS ===\n");

for (const s of scenarios) {
  console.log(`\n--- TESTING: ${s.name} ---`);
  
  // --- APPLY SALE LOGIC ---
  const currentPrice = parseFloat(s.variantData.price);
  const currentCompareAt = s.variantData.compareAtPrice ? parseFloat(s.variantData.compareAtPrice) : null;
  
  console.log(`[Before Sale] Price: ${currentPrice}, CompareAt: ${currentCompareAt}`);

  const strategy = s.sale.discountStrategy || "COMPARE_AT";
  let basePrice = currentPrice;
  let targetCompareAt = currentCompareAt;

  if (strategy === "COMPARE_AT") {
    basePrice = currentCompareAt || currentPrice;
    targetCompareAt = basePrice;
  } else if (strategy === "USE_CURRENT_AS_COMPARE") {
    basePrice = currentPrice;
    targetCompareAt = currentPrice;
  } else if (strategy === "KEEP_COMPARE_AT") {
    basePrice = currentPrice;
    targetCompareAt = currentCompareAt;
  }

  let discountAmount = 0;
  if (s.sale.discountType === "PERCENTAGE") {
    discountAmount = basePrice * (s.sale.value / 100);
  } else if (s.sale.discountType === "FIXED_AMOUNT") {
    discountAmount = s.sale.value;
  }

  let newPrice = basePrice - discountAmount;
  let newCompareAt = targetCompareAt;

  if (strategy === "INCREASE_COMPARE") {
    newPrice = currentPrice;
    newCompareAt = currentPrice + discountAmount;
  }

  if (newPrice < 0) newPrice = 0;

  const appliedPrice = newPrice.toFixed(2);
  const appliedCompareAt = newCompareAt ? newCompareAt.toFixed(2) : null;
  
  console.log(`[Sale Applied successfully] Price: ${appliedPrice}, CompareAt: ${appliedCompareAt}`);

  // Simulating Database save
  const dbItem = {
    originalPrice: currentPrice,
    originalCompareAt: currentCompareAt
  };
  console.log(`[Original values stored] originalPrice: ${dbItem.originalPrice}, originalCompareAt: ${dbItem.originalCompareAt}`);

  // Simulating Shopify State
  let shopifyPrice = appliedPrice;
  let shopifyCompareAt = appliedCompareAt;

  if (s.manualChangeDuringSale) {
    shopifyPrice = s.manualChangeDuringSale;
    console.log(`[Merchant manually edits price during active sale] Shopify Price is now: ${shopifyPrice}`);
  }
  if (s.manualCompareAtChangeDuringSale) {
    shopifyCompareAt = s.manualCompareAtChangeDuringSale;
    console.log(`[Merchant manually edits compare-at during active sale] Shopify CompareAt is now: ${shopifyCompareAt}`);
  }

  // --- REVERT SALE LOGIC ---
  console.log(`[Revert attempted]`);
  
  const shopifyCurrentPrice = parseFloat(shopifyPrice);
  const shopifyCurrentCompareAt = shopifyCompareAt ? parseFloat(shopifyCompareAt) : null;

  let origBasePrice = dbItem.originalPrice;
  let origCompareAt = dbItem.originalCompareAt !== null ? parseFloat(dbItem.originalCompareAt) : null;
  
  if (strategy === "COMPARE_AT") {
    origBasePrice = origCompareAt || dbItem.originalPrice;
  }
  
  let expectedDiscountedPrice = origBasePrice;
  if (strategy === "INCREASE_COMPARE") {
    expectedDiscountedPrice = dbItem.originalPrice;
  } else {
    if (s.sale.discountType === "PERCENTAGE") {
      expectedDiscountedPrice = origBasePrice - (origBasePrice * (s.sale.value / 100));
    } else if (s.sale.discountType === "FIXED_AMOUNT") {
      expectedDiscountedPrice = origBasePrice - s.sale.value;
    }
  }
  
  if (expectedDiscountedPrice < 0) expectedDiscountedPrice = 0;

  let expectedCompareAt = origCompareAt;
  if (strategy === "COMPARE_AT") {
    expectedCompareAt = origBasePrice;
  } else if (strategy === "USE_CURRENT_AS_COMPARE") {
    expectedCompareAt = dbItem.originalPrice;
  }
  
  if (strategy === "INCREASE_COMPARE") {
    let discountAmount = 0;
    if (s.sale.discountType === "PERCENTAGE") discountAmount = origBasePrice * (s.sale.value / 100);
    else if (s.sale.discountType === "FIXED_AMOUNT") discountAmount = s.sale.value;
    expectedCompareAt = dbItem.originalPrice + discountAmount;
  }

  const priceChanged = Math.abs(shopifyCurrentPrice - expectedDiscountedPrice) > 0.01 && !["0.00", "0"].includes(shopifyCurrentPrice.toFixed(2));
  
  let compareAtChanged = false;
  if (shopifyCurrentCompareAt !== null || expectedCompareAt !== null) {
     if (shopifyCurrentCompareAt === null || expectedCompareAt === null || Math.abs(shopifyCurrentCompareAt - expectedCompareAt) > 0.01) {
         compareAtChanged = true;
     }
  }

  if (priceChanged || compareAtChanged) {
     console.log(`[Revert safely skipped] Manual price change detected! Expected Price: ${expectedDiscountedPrice}, Found: ${shopifyCurrentPrice}. Expected CompareAt: ${expectedCompareAt}, Found: ${shopifyCurrentCompareAt}. Preserving manual change.`);
     console.log(`[Final State in Shopify] Price: ${shopifyCurrentPrice}, CompareAt: ${shopifyCurrentCompareAt}`);
     continue; 
  }

  let targetPrice = String(dbItem.originalPrice);
  let finalCompareAt = dbItem.originalCompareAt !== null ? String(dbItem.originalCompareAt) : null; 
  
  if (s.sale.deactivationStrategy === "REPLACE_WITH_COMPARE" && shopifyCurrentCompareAt) {
    targetPrice = String(shopifyCurrentCompareAt);
    finalCompareAt = null;
  }

  console.log(`[Revert completed] Restored Price: ${targetPrice}, Restored CompareAt: ${finalCompareAt}`);
  
  // Validation
  const valExpectedPrice = parseFloat(s.variantData.price);
  const valExpectedCompareAt = s.variantData.compareAtPrice ? parseFloat(s.variantData.compareAtPrice) : null;
  const actualTargetPrice = parseFloat(targetPrice);
  const actualFinalCompareAt = finalCompareAt ? parseFloat(finalCompareAt) : null;

  try {
      if (s.manualChangeDuringSale || s.manualCompareAtChangeDuringSale) {
          // If manually changed, it should NOT revert. It should preserve the manual changes.
          const expectedManualPrice = s.manualChangeDuringSale ? parseFloat(s.manualChangeDuringSale) : actualTargetPrice;
          const expectedManualCompareAt = s.manualCompareAtChangeDuringSale ? parseFloat(s.manualCompareAtChangeDuringSale) : actualFinalCompareAt;
          
          assert.strictEqual(shopifyCurrentPrice, expectedManualPrice, "Manual price was overwritten!");
          assert.strictEqual(shopifyCurrentCompareAt, expectedManualCompareAt, "Manual compareAt was overwritten!");
          console.log(`✅ [Validation Passed] Manual changes safely preserved.`);
      } else {
          // Normal reversion
          assert.strictEqual(actualTargetPrice, valExpectedPrice, "Restored price mismatch!");
          assert.strictEqual(actualFinalCompareAt, valExpectedCompareAt, "Restored compareAt mismatch!");
          console.log(`✅ [Validation Passed] Variant restored perfectly.`);
      }
  } catch (error) {
      console.error(`❌ [ASSERTION FAILED] ${error.message}`);
      process.exit(1);
  }
}
