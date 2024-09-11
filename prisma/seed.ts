import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const checklistItems = [
      {
        id_number: 1,
        checklist_item: "Baileys",
        checked: true,
      },
      {
        id_number: 2,
        checklist_item: "Sweet chilli sauce",
        checked: false,
      },
      {
        id_number: 3,
        checklist_item: "Spiced",
        checked: true,
      },
    ];

    const createdItems = await prisma.chopinLiszt.createMany({
      data: checklistItems,
    });

    console.log(`Seeded the database with ${createdItems.count} items.`);
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
