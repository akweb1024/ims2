const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const invoice = await prisma.invoice.findUnique({
    where: { id: '6ea0ff73-e9e3-4e67-a6ef-d2a733af6c71' },
    include: { lineItems: true, customerProfile: true }
  });
  console.log(JSON.stringify(invoice, null, 2));
}
run();
