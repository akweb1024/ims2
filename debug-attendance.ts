
import { prisma } from '@/lib/prisma';

async function main() {
    console.log('🔍 Debugging Attendance Issue...');

    const email = 'john.sales@stm.com';
    const user = await prisma.user.findFirst({ where: { email } });

    if (!user) {
        console.error('❌ User not found:', email);
        return;
    }
    console.log('✅ User found:', user.id);

    // 1. Profile Check
    let profile = await prisma.employeeProfile.findUnique({
        where: { userId: user.id }
    });

    if (!profile) {
        console.log('⚠️ Profile not found, creating...');
        try {
            profile = await prisma.employeeProfile.create({
                data: { userId: user.id }
            });
            console.log('✅ Profile created:', profile.id);
        } catch (e) {
            console.error('❌ Failed to create profile:', e);
            return;
        }
    } else {
        console.log('✅ Profile found:', profile.id);
    }

    // 2. Attendance Check
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data = {
        employeeId: profile.id,
        date: today,
        checkIn: new Date(),
        workFrom: 'OFFICE',
        status: 'PRESENT',
        latitude: null,
        longitude: null,
        isGeofenced: false,
        locationName: 'Debug Script'
    };

    console.log('Attempting upsert with data:', data);

    try {
        const record = await prisma.attendance.upsert({
            where: {
                employeeId_date: {
                    employeeId: profile.id,
                    date: today
                }
            },
            update: {
                checkIn: new Date(),
                workFrom: 'OFFICE',
                latitude: null,
                longitude: null,
                isGeofenced: false,
                locationName: 'Debug Update'
            },
            create: data
        });
        console.log('✅ Attendance Upsert Success:', record);
    } catch (e) {
        console.error('❌ Attendance Upsert Failed:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
