const { prisma } = require('./src/lib/prisma');
async function run() {
    const res = await prisma.proformaInvoice.findMany();
    console.log("Proforma count:", res.length);
    console.log("Records:", res);
}
run().catch(console.error).finally(() => process.exit(0));
