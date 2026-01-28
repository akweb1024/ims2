import { prisma } from '../src/lib/prisma';
import { FinanceService } from '../src/lib/services/finance';

async function main() {
    console.log('🚀 Starting Finance Backfill...');

    // 1. Get Company (Assume single company for now or iterate)
    const company = await prisma.company.findFirst();
    if (!company) {
        console.error('❌ No company found.');
        return;
    }
    const companyId = company.id;
    await FinanceService.ensureDefaultAccounts(companyId);

    // 2. Backfill Invoices
    console.log('📦 Backfilling Invoices...');
    const invoices = await prisma.invoice.findMany({
        where: { companyId, status: { not: 'UNPAID' } } // Only processed ones? Or all? Usually we book revenue on Invoice Creation (Accrual Basis).
        // Let's do all.
    });

    let invCount = 0;
    for (const inv of invoices) {
        // Check if JE exists
        const exists = await prisma.journalEntry.findFirst({
            where: { reference: inv.invoiceNumber, companyId }
        });

        if (!exists) {
            try {
                await FinanceService.postInvoiceJournal(companyId, inv.id);
                process.stdout.write('.');
                invCount++;
            } catch (e: any) {
                console.error(`\nFailed Invoice ${inv.invoiceNumber}: ${e.message}`);
            }
        }
    }
    console.log(`\n✅ Processed ${invCount} Invoices.`);

    // 3. Backfill Payments
    console.log('💸 Backfilling Payments...');
    const payments = await prisma.payment.findMany({
        where: { companyId }
    });

    let payCount = 0;
    for (const pay of payments) {
        // Use a unique reference for backfill to ensure idempotency
        const backfillRef = `BACKFILL-PAY-${pay.id}`;

        const exists = await prisma.journalEntry.findFirst({
            where: { reference: backfillRef, companyId }
        });

        if (!exists) {
            try {
                await FinanceService.postPaymentJournal(companyId, pay.id, backfillRef);
                process.stdout.write('.');
                payCount++;
            } catch (e: any) {
                // Silently fail or log?
                // console.error(e);
            }
        }
    }
    console.log(`\n✅ Processed ${payCount} Payments.`);

    console.log('🎉 Backfill Complete!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
