
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Prisma keys:', Object.keys(prisma));
    // also check if iTTask or ITTask exists
    console.log('Has iTTask:', 'iTTask' in prisma);
    console.log('Has ITTask:', 'ITTask' in prisma);
    console.log('Has itTask:', 'itTask' in prisma);

    // Try to count tasks to verify connection
    try {
        if (prisma.iTTask) {
            console.log('Counting iTTask...');
            const count = await prisma.iTTask.count();
            console.log('iTTask count:', count);
        }
    } catch (e) {
        console.error('Error accessing iTTask:', e.message);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
