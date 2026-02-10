
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Data Summary ---');

    const incrementCount = await prisma.salaryIncrementRecord.count();
    console.log('Total SalaryIncrementRecords:', incrementCount);

    const revenueCount = await prisma.revenueTransaction.count();
    console.log('Total RevenueTransactions:', revenueCount);

    const expenseCount = await prisma.financialRecord.count({ where: { type: 'EXPENSE' } });
    console.log('Total Expenses:', expenseCount);

    if (incrementCount > 0) {
        const sampleInc = await prisma.salaryIncrementRecord.findFirst();
        console.log('Sample Increment status:', sampleInc?.status);
        console.log('Sample Increment effectiveDate:', sampleInc?.effectiveDate);
    }

    if (revenueCount > 0) {
        const sampleRev = await prisma.revenueTransaction.findFirst();
        console.log('Sample Revenue status:', sampleRev?.status);
        console.log('Sample Revenue paymentDate:', sampleRev?.paymentDate);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
