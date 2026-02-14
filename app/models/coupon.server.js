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

  return prisma.coupon.create({
    data: {
      ...couponData,
      startTime: new Date(couponData.startTime),
      endTime: new Date(couponData.endTime),
      products: {
        create: products.map((p) => ({
          productId: p.productId,
        })),
      },
    },
  });
}

export async function updateCoupon(id, data) {
  const { products, ...couponData } = data;

  // Delete existing product associations
  await prisma.couponProduct.deleteMany({
    where: { couponId: id },
  });

  return prisma.coupon.update({
    where: { id },
    data: {
      ...couponData,
      startTime: new Date(couponData.startTime),
      endTime: new Date(couponData.endTime),
      products: {
        create: products.map((p) => ({
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

export async function getCouponsForProduct(productId) {
  const now = new Date();
  return db.coupon.findMany({
    where: {
      status: "ACTIVE",
      startTime: { lte: now },
      endTime: { gte: now },
      products: {
        some: { productId },
      },
    },
  });
}
