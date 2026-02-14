import db from "../db.server";

export async function createTimer(data) {
  return db.timer.create({ data });
}

export async function getTimer(id) {
  return db.timer.findUnique({ where: { id } });
}

export async function getTimers() {
  return db.timer.findMany({ orderBy: { createdAt: "desc" } });
}

export async function updateTimer(id, data) {
  return db.timer.update({ where: { id }, data });
}

export async function deleteTimer(id) {
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
