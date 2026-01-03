
import { prisma } from '@/lib/prisma';

async function verifySync() {
    console.log('🔄 Verifying Data Sync...');

    // 1. Identify a Test User (John Sales)
    const user = await prisma.user.findFirst({ where: { email: 'john.sales@stm.com' } });
    if (!user) {
        console.error('❌ User john.sales@stm.com not found. Cannot verify.');
        return;
    }

    // 2. Ensure Profile Exists
    let profile = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
        console.log('⚠️ Profile missing, creating temp profile...');
        profile = await prisma.employeeProfile.create({ data: { userId: user.id } });
    }

    // 3. Create a Dummy Work Report (Simulating Auto-Generate)
    const reportData = {
        employeeId: profile.id,
        title: 'Sync Verification Test',
        content: 'Testing database persistence of new fields.',
        category: 'DEVELOPMENT',
        keyOutcome: 'Verified DB Sync',
        hoursSpent: 1.5,
        selfRating: 9,
        date: new Date()
    };

    console.log('📝 Creating WorkReport with data:', reportData);

    const report = await prisma.workReport.create({
        data: reportData
    });

    // 4. Read it back immediately
    const savedReport = await prisma.workReport.findUnique({
        where: { id: report.id }
    });

    console.log('🔍 Read Back Result:', savedReport);

    // 5. Verification Checks
    let allGood = true;
    if (savedReport?.category !== reportData.category) {
        console.error('❌ Category Mismatch:', savedReport?.category);
        allGood = false;
    }
    if (savedReport?.keyOutcome !== reportData.keyOutcome) {
        console.error('❌ KeyOutcome Mismatch:', savedReport?.keyOutcome);
        allGood = false;
    }
    if (savedReport?.employeeId !== profile.id) {
        console.error('❌ Employee Relation Mismatch');
        allGood = false;
    }

    if (allGood) {
        console.log('✅ SUCCESS: All fields synced correctly to the database.');

        // Clean up
        await prisma.workReport.delete({ where: { id: report.id } });
        console.log('🧹 Test data cleaned up.');
    } else {
        console.error('❌ SYNC FAILURE: Data not persisted as expected.');
    }
}

verifySync()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
