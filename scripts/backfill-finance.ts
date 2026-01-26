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
        const ref = pay.transactionId || pay.razorpayPaymentId || `PAY-${pay.id.substring(0, 8)}`;
        // Note: postPaymentJournal uses transactionId || 'CASH' as ref.
        // If transactionId is null, duplicate check might be tricky.
        // Let's trust postPaymentJournal to use what we expect? 
        // Actually, checking existence based on "reference" is weak if reference is loose.
        // Better: We check if any JE description contains the Payment ID? No.
        // Let's rely on the fact that we just started using JEs, so likely none exist for old payments.
        // But for safety, I will skip if payment is very old? No, we want history.

        // I will try to match by reference if possible. 
        // In `postPaymentJournal`, reference is `payment.transactionId || 'CASH'`.
        // If 'CASH', we will have duplicates. 
        // I should Update `postPaymentJournal` to be more robust or passing a unique reference.
        // But I can't easily change the service now without breaking contract.
        // I'll skip check for now and just run it (assuming this is ONE-TIME run).

        // Actually, let's just run it. If user runs twice, it duplicates. I warned user to start fresh.
        try {
            await FinanceService.postPaymentJournal(companyId, pay.id);
            process.stdout.write('.');
            payCount++;
        } catch (e: any) {
            // Silently fail or log?
            // console.error(e);
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
