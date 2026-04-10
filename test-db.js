const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const p = await prisma.proformaInvoice.count();
    const po = await prisma.purchaseOrder.count();
    console.log(`Proformas: ${p}, POs: ${po}`);
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
