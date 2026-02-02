
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const profiles = await prisma.employeeProfile.findMany({
        take: 10,
        select: { id: true, userId: true }
    });

    console.log('Sample ID Mappings:');
    profiles.forEach(p => {
        console.log(`Profile ID: ${p.id} | User ID: ${p.userId} | Match: ${p.id === p.userId}`);
    });

    const attendanceCount = await prisma.attendance.count();
    console.log('Total Attendance Records:', attendanceCount);

    if (attendanceCount > 0) {
        const sampleAtt = await prisma.attendance.findFirst();
        console.log('Sample Attendance Record Link:', sampleAtt.employeeId);

        // Check if it matches a User ID or a Profile ID
        const matchesProfile = await prisma.employeeProfile.findUnique({ where: { id: sampleAtt.employeeId } });
        const matchesUser = await prisma.user.findUnique({ where: { id: sampleAtt.employeeId } });

        console.log(`Linked ID matches a Profile: ${!!matchesProfile}`);
        console.log(`Linked ID matches a User: ${!!matchesUser}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
