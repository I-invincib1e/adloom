import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function check() {
  try {
    const sessionCount = await prisma.session.count();
    console.log(`Sessions in DB: ${sessionCount}`);
    const saleCount = await prisma.sale.count();
    console.log(`Sales in DB: ${saleCount}`);
    process.exit(0);
  } catch (err) {
    console.error("Database check failed:", err);
    process.exit(1);
  }
}
check();
