import { prisma } from '../src/lib/prisma';

async function audit() {
    console.log('🔍 Auditing for November 2026 Leave Ledger Entries...');

    const year = 2026;
    const month = 11;

    const futureLedgers = await prisma.leaveLedger.findMany({
        where: {
            year,
            month
        },
        include: {
            employee: {
                include: { user: true }
            }
        }
    });

    console.log(`\nFound ${futureLedgers.length} ledger entries for 11/2026.`);

    if (futureLedgers.length > 0) {
        console.log('\nSample Error Data:');
        futureLedgers.slice(0, 5).forEach(l => {
            console.log(`- Employee: ${l.employee.user.name}, Month: ${l.month}, Year: ${l.year}, Closing: ${l.closingBalance}`);
        });
    }

    await prisma.$disconnect();
}

audit();
