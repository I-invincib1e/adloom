import db from "../db.server";

export async function getCoupons(shop) {
  return db.coupon.findMany({
    where: { 
      OR: [
        { shop },
        { shop: "unknown" },
        { shop: "undefined" },
        { shop: "" }
      ]
    },
    orderBy: { createdAt: "desc" },
    include: { products: true },
  });
}

export async function getCoupon(id, shop) {
  const coupon = await db.coupon.findUnique({
    where: { id },
    include: { products: true },
  });
  if (!coupon) return null;
  const isOrphan = ["unknown", "undefined", ""].includes(coupon.shop);
  if (!isOrphan && shop && coupon.shop !== shop) return null;
  return coupon;
}

export async function deleteCoupon(id, shop) {
  const coupon = await getCoupon(id, shop);
  if (!coupon) return;
  await db.couponProduct.deleteMany({ where: { couponId: id } });
  return db.coupon.delete({ where: { id } });
}

export async function createCoupon(data, shop) {
  if (!shop) throw new Error("Shop is required");
  const { products, ...couponData } = data;
  
  const selection = products;
  const productItems = selection.type === "products" ? selection.products : [];

  return db.coupon.create({
    data: {
      ...couponData,
      shop,
      priority: parseInt(couponData.priority) || 0,
      startTime: new Date(couponData.startTime),
      endTime: new Date(couponData.endTime),
      products: {
        create: productItems.map((p) => ({
          productId: p.productId,
        })),
      },
    },
  });
}

export async function updateCoupon(id, data, shop) {
  const coupon = await getCoupon(id, shop);
  if (!coupon) throw new Error("Unauthorized or Not Found");

  const { products, shop: _shop, ...couponData } = data;
  const selection = products;
  const productItems = selection.type === "products" ? selection.products : [];

  // Delete existing product associations
  await db.couponProduct.deleteMany({
    where: { couponId: id },
  });

  return db.coupon.update({
    where: { id },
    data: {
      ...couponData,
      priority: parseInt(couponData.priority) || 0,
      startTime: new Date(couponData.startTime),
      endTime: new Date(couponData.endTime),
      products: {
        create: productItems.map((p) => ({
          productId: p.productId,
        })),
      },
    },
  });
}

export async function getCouponsForProduct(productId, productData = {}, shop) {
  const now = new Date();
  const allCoupons = await db.coupon.findMany({
    where: {
      shop,
      status: "ACTIVE",
      startTime: { lte: now },
      endTime: { gte: now },
    },
    include: { products: true },
  });

  // Sort by priority (lower first), then by newest
  return allCoupons.filter((coupon) => {
    let style;
    try {
      style = JSON.parse(coupon.style || "{}");
    } catch {
      style = {};
    }

    const isProductMatch = coupon.products.some((p) => p.productId === productId);
    if (isProductMatch) return true;

    const selection = style.selection || {};
    if (selection.type === "all") return true;
    
    if (selection.type === "tags" && productData.tags) {
      const productTags = productData.tags.split(",").map(t => t.trim().toLowerCase());
      return selection.tags.some(tag => productTags.includes(tag.toLowerCase()));
    }

    if (selection.type === "vendors" && productData.vendor) {
      return (selection.vendors || []).some(v => v.toLowerCase() === productData.vendor.toLowerCase());
    }

    if (selection.type === "collections" && productData.collections) {
      const productCollectionIds = productData.collections.split(",").map(id => id.trim());
      return (selection.collections || []).some((c) => {
        const numericId = String(c.id).replace("gid://shopify/Collection/", "");
        return productCollectionIds.includes(numericId);
      });
    }
    
    return false;
  }).sort((a, b) => {
    // Sort by priority ascending (lower = higher priority)
    const pA = a.priority || 0;
    const pB = b.priority || 0;
    if (pA !== pB) return pA - pB;
    // Then by newest first
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

export async function updateCouponPriority(id, priority, shop) {
  const coupon = await getCoupon(id, shop);
  if (!coupon) throw new Error("Unauthorized or Not Found");
  return db.coupon.update({
    where: { id },
    data: { priority: parseInt(priority) || 0 },
  });
}
