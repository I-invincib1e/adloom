import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const timer = await prisma.timer.findFirst({ where: { shop: "unknown" } });
  console.log("Unknown timer:", timer ? timer.id : "None");
}

check().finally(() => prisma.$disconnect());
