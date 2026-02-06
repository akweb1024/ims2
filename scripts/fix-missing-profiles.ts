
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('🔧 Starting Fix for Missing Employee Profiles...');

    // Find users with staff roles but NO employee profile
    const staffRoles = ['MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN', 'HR_MANAGER', 'HR', 'EMPLOYEE', 'ADMIN'];

    const usersWithoutProfile = await prisma.user.findMany({
        where: {
            role: { in: staffRoles as any },
            employeeProfile: { is: null }
        },
        include: {
            company: true
        }
    });

    console.log(`\n👥 Found ${usersWithoutProfile.length} staff users missing profiles.`);

    for (const user of usersWithoutProfile) {
        console.log(`   - Creating profile for: ${user.name || user.email} (${user.role})`);

        try {
            const now = new Date();
            const employeeId = `EMP${now.getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

            await prisma.employeeProfile.create({
                data: {
                    userId: user.id,
                    employeeId: employeeId,
                    dateOfJoining: now, // Default to now if unknown
                    designationId: null, // Can be updated later
                    // Map role to designation string as fallback
                    designation: user.role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
                    baseSalary: 50000, // Default placeholder
                }
            });
            console.log(`     ✅ Created Profile [${employeeId}]`);
        } catch (error) {
            console.error(`     ❌ Failed: ${error}`);
        }
    }

    console.log('\n✅ Fix Complete. Staff list should now be populated.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
