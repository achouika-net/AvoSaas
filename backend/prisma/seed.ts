import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');
  
  const center = await prisma.center.upsert({
    where: { id: 'center-1' },
    update: {},
    create: {
      id: 'center-1',
      name: 'مركز الدار البيضاء (الرئيسي)',
      address: 'الدار البيضاء، المغرب',
    },
  });

  console.log('Created center:', center.name);
  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
