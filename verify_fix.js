const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    console.log('--- Starting Verification ---');

    // 1. Amit's IDs
    const amitEmail = 'amit@conwiz.in';
    const amitUser = await prisma.user.findUnique({ where: { email: amitEmail }, include: { employeeProfile: true } });

    if (!amitUser || !amitUser.employeeProfile) {
        console.error('Amit not found');
        return;
    }

    console.log(`Amit User ID: ${amitUser.id}`);
    console.log(`Amit Profile ID: ${amitUser.employeeProfile.id}`);

    // 2. Test ID resolution logic simulations (Simplified)
    async function resolveId(id) {
        const profile = await prisma.employeeProfile.findFirst({
            where: { OR: [{ id }, { userId: id }] },
            select: { id: true, userId: true }
        });
        return profile;
    }

    const fromUserId = await resolveId(amitUser.id);
    const fromProfileId = await resolveId(amitUser.employeeProfile.id);

    console.log('ID Resolution (User ID):', fromUserId ? 'PASSED' : 'FAILED');
    console.log('ID Resolution (Profile ID):', fromProfileId ? 'PASSED' : 'FAILED');

    // 3. Check for specific fields in Increment Record (for sync validation)
    const draftRecord = await prisma.salaryIncrementRecord.findFirst({
        where: { employeeProfileId: amitUser.employeeProfile.id, status: 'DRAFT' }
    });

    if (draftRecord) {
        console.log('Draft Increment Record Found:', draftRecord.id);
        console.log('New KRA in Record:', draftRecord.newKRA);
        console.log('New KPI in Record:', draftRecord.newKPI);
    } else {
        console.log('No draft record found for Amit - skip sync check');
    }

    // 4. Verify Attendance Linkage Count
    const attendanceCount = await prisma.attendance.count({ where: { employeeId: amitUser.employeeProfile.id } });
    console.log('Attendance Records for Amit (Profile ID):', attendanceCount);

    await prisma.$disconnect();
}

verify().catch(console.error);
