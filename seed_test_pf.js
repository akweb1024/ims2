const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function seed() {
    const customer = await prisma.customerProfile.findFirst();
    if (!customer) { console.log('No customer profile to use'); return; }
    
    // Create a demo proforma
    await prisma.proformaInvoice.create({
        data: {
            proformaNumber: 'PRF-DEMO-001',
            customerProfileId: customer.id,
            companyId: customer.companyId,
            status: 'PAYMENT_PENDING',
            brandId: 'STM_LEARN',
            subtotal: 50000,
            total: 59000,
            currency: 'INR',
            placeOfSupply: 'Maharashtra',
            taxRate: 18,
            taxAmount: 9000,
            lineItems: [
                { description: "Logistics Preparation Kit", quantity: 5, unitPrice: 10000, total: 50000 }
            ],
            notes: "Demo Proforma for UI testing",
        }
    });
    console.log("Created demo proforma invoice PRF-DEMO-001");
}

seed().catch(console.error).finally(() => process.exit(0));
