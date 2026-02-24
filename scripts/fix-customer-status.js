
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  try {
    const result = await prisma.customerProfile.updateMany({
      where: {
        leadStatus: 'NEW'
      },
      data: {
        leadStatus: null
      }
    });
    console.log(`Successfully migrated ${result.count} customers.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
nodes
