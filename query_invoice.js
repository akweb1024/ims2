const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoice = await prisma.invoice.findUnique({
    where: { id: 'b3fd4740-02dc-4d62-b4f3-a94681969401' },
    include: {
      lineItems: true,
      company: true,
      customerProfile: true,
      subscription: {
        include: { customerProfile: true }
      }
    }
  });
  console.log(JSON.stringify(invoice, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
