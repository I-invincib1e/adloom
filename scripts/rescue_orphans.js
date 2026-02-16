import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function rescue() {
  const shop = process.argv[2];
  if (!shop) {
    console.error("Please provide a shop domain as an argument");
    process.exit(1);
  }

  console.log(`Rescuing orphans for shop: ${shop}`);

  const tables = ["timer", "coupon", "sale"];
  
  for (const table of tables) {
    const orphans = await prisma[table].findMany({
      where: { shop: { in: ["unknown", "undefined", ""] } }
    });
    
    console.log(`Found ${orphans.length} orphaned ${table}s`);
    
    for (const orphan of orphans) {
      await prisma[table].update({
        where: { id: orphan.id },
        data: { shop }
      });
      console.log(`Rescued ${table}: ${orphan.name || orphan.offerTitle || orphan.title || orphan.id}`);
    }
  }
  
  console.log("Cleanup complete!");
}

rescue().finally(() => prisma.$disconnect());
