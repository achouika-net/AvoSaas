const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting test...');
  try {
    const res = await prisma.center.upsert({
      where: { id: 'center-1' },
      update: { 
        geminiApiKey: 'test-api-key',
        logo: 'test-logo',
        headerTextAr: 'Ar Header',
        headerTextFr: 'Fr Header',
        footerTextAr: 'Ar Footer',
        footerTextFr: 'Fr Footer'
      },
      create: { 
        id: 'center-1', 
        name: 'Test Office',
        geminiApiKey: 'test-api-key',
        logo: 'test-logo',
        headerTextAr: 'Ar Header',
        headerTextFr: 'Fr Header',
        footerTextAr: 'Ar Footer',
        footerTextFr: 'Fr Footer'
      }
    });
    console.log('Success:', res);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
