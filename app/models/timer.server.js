import db from "../db.server";

export async function createTimer(data, shop) {
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
  if (!timer) return null;
  return db.timer.update({ where: { id }, data });
}

export async function deleteTimer(id, shop) {
  const timer = await getTimer(id, shop);
  if (!timer) return;
  return db.timer.delete({ where: { id } });
}

export async function duplicateTimer(id) {
  const source = await db.timer.findUnique({ where: { id } });
  if (!source) throw new Error("Timer not found");
  const { id: _id, createdAt, updatedAt, ...data } = source;
  return db.timer.create({
    data: { ...data, name: `${data.name} (Copy)` },
  });
}
