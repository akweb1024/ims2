
import prisma from './src/lib/prisma';

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'shubham.stmj@gmail.com' },
        select: {
            id: true,
            email: true,
            role: true,
            companyId: true,
            isActive: true,
            employeeProfile: true
        }
    });
    console.log('USER_DETAILS:', JSON.stringify(user, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
