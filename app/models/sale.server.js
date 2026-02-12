import prisma from "../db.server";

export async function getSales() {
  return prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });
}

export async function deleteSale(saleId, admin) {
  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) return;

  if (sale.status === "ACTIVE") {
    await revertSale(saleId, admin);
  }

  await prisma.saleItem.deleteMany({ where: { saleId: saleId } });
  await prisma.sale.delete({ where: { id: saleId } });
}

export async function createSale({
  title,
  discountType,
  value,
  startTime,
  endTime,
  items,
  overrideCents,
  discountStrategy,
  excludeDrafts,
  excludeOnSale,
  allowOverride,
  deactivationStrategy,
  timerId,
  tagsToAdd,
  tagsToRemove,
}) {
  // items should be an array of { productId, variantId }
  return prisma.sale.create({
    data: {
      title,
      discountType,
      value: parseFloat(value),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: "PENDING",
      overrideCents: overrideCents === true,
      discountStrategy,
      excludeDrafts: excludeDrafts === true,
      excludeOnSale: excludeOnSale === true,
      allowOverride: allowOverride === true,
      deactivationStrategy,
      timerId,
      tagsToAdd,
      tagsToRemove,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          originalPrice: 0, // Will be updated when applied
        })),
      },
    },
  });
}

export async function getSale(id) {
  return prisma.sale.findUnique({
    where: { id },
    include: { items: true },
  });
}

// Logic to apply the discount
export async function applySale(saleId, admin) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });

  if (!sale || sale.status === "ACTIVE" || sale.status === "COMPLETED") return;

  // 1. Fetch current prices for all variants in the sale
  // We'll query them one by one or in batches. For simplicity, looping via Promise.all
  // GraphQL to fetch variant price
  const query = `
    query getVariant($id: ID!) {
      productVariant(id: $id) {
        id
        price
      }
    }
  `;

  // We need to update SaleItems with originalPrice and then push updates to Shopify
  const itemsToUpdate = [];
  
  for (const item of sale.items) {
    const response = await admin.graphql(query, {
      variables: { id: item.variantId },
    });
    const { data } = await response.json();
    
    if (data?.productVariant) {
      const originalPrice = parseFloat(data.productVariant.price);
      
      // Calculate new price
      let newPrice = originalPrice;
      if (sale.discountType === "PERCENTAGE") {
        newPrice = originalPrice - (originalPrice * (sale.value / 100));
      } else if (sale.discountType === "FIXED_AMOUNT") {
        newPrice = originalPrice - sale.value;
      }
      
      if (newPrice < 0) newPrice = 0;

      itemsToUpdate.push({
        id: item.id,
        productId: item.productId, // Added productId
        variantId: item.variantId,
        originalPrice: originalPrice,
        newPrice: newPrice.toFixed(2),
      });
    }
  }

  // 2. Update Shopify Prices
  // Using productVariantsBulkUpdate mutation
  const mutation = `
    mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  // Group updates by productId to minimize API calls and match mutation requirements
  const updatesByProduct = itemsToUpdate.reduce((acc, item) => {
    if (!acc[item.productId]) {
      acc[item.productId] = [];
    }
    acc[item.productId].push(item);
    return acc;
  }, {});

  for (const productId in updatesByProduct) {
    const variants = updatesByProduct[productId].map(item => ({
      id: item.variantId,
      price: item.newPrice
    }));

    await admin.graphql(mutation, {
      variables: {
        productId,
        variants
      },
    });
  }

  // 3. Update SaleItem snapshot in DB
  for (const update of itemsToUpdate) {
     await prisma.saleItem.update({
      where: { id: update.id },
      data: { originalPrice: update.originalPrice },
    });
  }

  // 4. Update Sale status
  await prisma.sale.update({
    where: { id: saleId },
    data: { status: "ACTIVE" },
  });

  return itemsToUpdate.length;
}

// Logic to revert the discount
export async function revertSale(saleId, admin) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });

  if (!sale || sale.status !== "ACTIVE") return;

  const mutation = `
    mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  // Group by product ID
  const updatesByProduct = sale.items.reduce((acc, item) => {
    if (!acc[item.productId]) {
      acc[item.productId] = [];
    }
    acc[item.productId].push(item);
    return acc;
  }, {});

  for (const productId in updatesByProduct) {
    const variants = updatesByProduct[productId].map(item => ({
      id: item.variantId,
      price: String(item.originalPrice)
    }));
      
    await admin.graphql(mutation, {
        variables: {
          productId,
          variants
        },
      });
  }

  await prisma.sale.update({
    where: { id: saleId },
    data: { status: "COMPLETED" },
  });
}
