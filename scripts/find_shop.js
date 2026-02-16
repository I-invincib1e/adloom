import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function findShop() {
  const session = await prisma.session.findFirst();
  console.log(session ? session.shop : "No session found");
}

findShop().finally(() => prisma.$disconnect());
