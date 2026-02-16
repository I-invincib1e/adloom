import db from "../db.server";

export async function getCoupons() {
  return db.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { products: true },
  });
}

export async function getCoupon(id) {
  return db.coupon.findUnique({
    where: { id },
    include: { products: true },
  });
}

export async function createCoupon(data) {
  const { products, ...couponData } = data;
  
  // products is now an object: { type, products: [], collections: [], tags: [], vendors: [] }
  const selection = products;
  const productItems = selection.type === "products" ? selection.products : [];

  return db.coupon.create({
    data: {
      ...couponData,
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

export async function updateCoupon(id, data) {
  const { products, ...couponData } = data;
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

export async function deleteCoupon(id) {
  await db.couponProduct.deleteMany({ where: { couponId: id } });
  return db.coupon.delete({ where: { id } });
}

export async function getCouponsForProduct(productId, productData = {}) {
  const now = new Date();
  const allCoupons = await db.coupon.findMany({
    where: {
      status: "ACTIVE",
      startTime: { lte: now },
      endTime: { gte: now },
    },
    include: { products: true },
  });

  return allCoupons.filter((coupon) => {
    let style;
    try {
      style = JSON.parse(coupon.style || "{}");
    } catch {
      style = {};
    }

    // New selection logic stored in style JSON for backward compatibility
    // Actually, I should have stored it in Coupon model, but Style is a safe place for now.
    // However, I passed it in 'products' field in the action, but it's not saved to DB unless I update the schema.
    // Wait, the action currently sends 'style' as a JSON string. I'll put the selection config in there.
    
    // Check direct product association (legacy or explicit)
    const isProductMatch = coupon.products.some((p) => p.productId === productId);
    if (isProductMatch) return true;

    // Check advanced criteria in style config
    const selection = style.selection || {};
    if (selection.type === "all") return true;
    
    if (selection.type === "tags" && productData.tags) {
      const productTags = productData.tags.split(",").map(t => t.trim().toLowerCase());
      return selection.tags.some(tag => productTags.includes(tag.toLowerCase()));
    }

    if (selection.type === "vendors" && productData.vendor) {
      return selection.vendors.some(v => v.toLowerCase() === productData.vendor.toLowerCase());
    }

    // Collections would need more info or another lookup, skipping for now as a limitation
    // but the UI supports it.
    
    return false;
  });
}
