import { prisma } from '../src/lib/prisma';

async function auditFuture() {
    console.log('🔍 Auditing for ANY Future Leave Ledger Entries (Year >= 2026, Month > 2 or Year > 2026)...');

    const currentYear = 2026;
    const currentMonth = 2; // February

    const entries = await prisma.leaveLedger.findMany({
        where: {
            OR: [
                { year: { gt: currentYear } },
                { year: currentYear, month: { gt: currentMonth } }
            ]
        },
        include: {
            employee: {
                include: { user: true }
            }
        }
    });

    console.log(`\nFound ${entries.length} future-dated ledger entries.`);

    entries.forEach(l => {
        console.log(`- ${l.employee.user.name}: ${l.month}/${l.year}, Closing: ${l.closingBalance}`);
    });

    await prisma.$disconnect();
}

auditFuture();
