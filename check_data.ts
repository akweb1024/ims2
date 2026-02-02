
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'amit@conwiz.in'; // As seen in logs
    console.log('Querying for:', email);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            employeeProfile: {
                include: {
                    attendance: true,
                    workReports: true,
                    incrementHistory: true
                }
            }
        }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log('User ID:', user.id);
    console.log('Profile ID:', user.employeeProfile?.id);
    console.log('Attendance Count:', user.employeeProfile?.attendance?.length);
    if (user.employeeProfile?.attendance?.length) {
        console.log('Sample Attendance:', user.employeeProfile.attendance[0]);
    }

    // Check if attendance exists orphaned or under User ID if model allows (it doesn't seems to)
    const orphanedAttendance = await prisma.attendance.findMany({
        where: { employeeId: user.id } // If it was linked to user ID by mistake
    });
    console.log('Attendance records with User ID (potential mismatch):', orphanedAttendance.length);

}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
