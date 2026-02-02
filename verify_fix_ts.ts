import { prisma } from './src/lib/prisma';

async function verify() {
    console.log('--- Starting Verification ---');

    const amitEmail = 'amit@conwiz.in';
    const amitUser = await prisma.user.findUnique({
        where: { email: amitEmail },
        include: { employeeProfile: true }
    });

    if (!amitUser || !amitUser.employeeProfile) {
        console.error('Amit not found');
        return;
    }

    console.log(`Amit User ID: ${amitUser.id}`);
    console.log(`Amit Profile ID: ${amitUser.employeeProfile.id}`);

    const resolveId = async (id: string) => {
        return await prisma.employeeProfile.findFirst({
            where: { OR: [{ id }, { userId: id }] },
            select: { id: true, userId: true }
        });
    };

    const fromUserId = await resolveId(amitUser.id);
    const fromProfileId = await resolveId(amitUser.employeeProfile.id);

    console.log('ID Resolution (User ID):', fromUserId ? 'PASSED' : 'FAILED');
    console.log('ID Resolution (Profile ID):', fromProfileId ? 'PASSED' : 'FAILED');

    const latestIncrement = await prisma.salaryIncrementRecord.findFirst({
        where: {
            employeeProfileId: amitUser.employeeProfile.id,
            status: 'APPROVED'
        },
        orderBy: { effectiveDate: 'desc' }
    });

    if (latestIncrement) {
        console.log('Latest Approved Increment found');
    } else {
        console.log('No approved increments for Amit yet (Matches expected state)');
    }

    process.exit(0);
}

verify().catch(e => {
    console.error(e);
    process.exit(1);
});
