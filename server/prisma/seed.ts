import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const business = await prisma.business.upsert({
    where: { slug: "city-hospital" },
    update: {},
    create: {
      name: "City Hospital",
      slug: "city-hospital",
      queues: {
        create: [
          {
            name: "General Consultation",
            prefix: "A",
            averageServiceTime: 5
          },
          {
            name: "Pharmacy",
            prefix: "P",
            averageServiceTime: 2
          }
        ]
      }
    }
  });

  console.log({ business });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
