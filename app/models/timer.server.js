import db from "../db.server";

export async function createTimer(data, shop) {
  if (!shop) throw new Error("Shop is required for creation");
  return db.timer.create({ data: { ...data, shop } });
}

export async function getTimer(id, shop) {
  const timer = await db.timer.findUnique({ where: { id } });
  if (!timer || (shop && timer.shop !== shop)) return null;
  return timer;
}

export async function getTimers(shop) {
  return db.timer.findMany({ 
    where: { shop },
    orderBy: { createdAt: "desc" } 
  });
}

export async function updateTimer(id, data, shop) {
  const timer = await getTimer(id, shop);
  if (!timer) throw new Error("Unauthorized or Not Found");
  
  // Ensure we don't accidentally change the shop or ID
  const { id: _id, shop: _shop, ...updateData } = data;
  return db.timer.update({ 
    where: { id }, 
    data: updateData 
  });
}

export async function deleteTimer(id, shop) {
  const timer = await getTimer(id, shop);
  if (!timer) throw new Error("Unauthorized or Not Found");
  return db.timer.delete({ where: { id } });
}

export async function duplicateTimer(id, shop) {
  const source = await getTimer(id, shop);
  if (!source) throw new Error("Timer not found or unauthorized");
  const { id: _id, createdAt, updatedAt, ...data } = source;
  return db.timer.create({
    data: { ...data, name: `${data.name} (Copy)` },
  });
}
