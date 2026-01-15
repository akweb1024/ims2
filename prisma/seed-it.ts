import bcrypt from 'bcryptjs';
import { prisma as db } from '../src/lib/prisma';

async function main() {
    const prisma = db;
    console.log('🌱 Seeding IT Management data...');

    const hashedPassword = await bcrypt.hash('password123', 12);

    // 1. Get or Create Company
    const company = await prisma.company.findFirst({
        where: { name: 'STM Journals Inc' }
    }) || await prisma.company.create({
        data: {
            name: 'STM Journals Inc',
            domain: 'stm.com',
            email: 'contact@stm.com',
        }
    });

    // 2. Create IT Users
    console.log('👤 Creating IT Team...');
    const itManager = await prisma.user.upsert({
        where: { email: 'it.manager@stm.com' },
        update: {},
        create: {
            email: 'it.manager@stm.com',
            password: hashedPassword,
            role: 'IT_MANAGER' as any,
            name: 'Ian IT Manager',
            companyId: company.id,
            emailVerified: true,
        }
    });

    const dev1 = await prisma.user.upsert({
        where: { email: 'it.dev1@stm.com' },
        update: {},
        create: {
            email: 'it.dev1@stm.com',
            password: hashedPassword,
            role: 'IT_ADMIN' as any,
            name: 'David Developer',
            companyId: company.id,
            emailVerified: true,
            managerId: itManager.id
        }
    });

    const dev2 = await prisma.user.upsert({
        where: { email: 'it.dev2@stm.com' },
        update: {},
        create: {
            email: 'it.dev2@stm.com',
            password: hashedPassword,
            role: 'IT_ADMIN' as any,
            name: 'Sarah Specialist',
            companyId: company.id,
            emailVerified: true,
            managerId: itManager.id
        }
    });

    // 3. Create Projects
    console.log('📂 Creating Projects...');
    const project1 = await (prisma as any).iTProject.create({
        data: {
            companyId: company.id,
            projectCode: 'PRJ-PORTAL-001',
            name: 'Author Portal Expansion',
            description: 'Adding multi-language support and advanced submission tracking to the author portal.',
            category: 'DEVELOPMENT',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            projectManagerId: itManager.id,
            teamLeadId: dev1.id,
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
            isRevenueBased: true,
            estimatedRevenue: 500000,
            itDepartmentCut: 150000,
            currency: 'INR'
        }
    });

    const project2 = await (prisma as any).iTProject.create({
        data: {
            companyId: company.id,
            projectCode: 'PRJ-INFRA-002',
            name: 'Server Migration',
            description: 'Migrating legacy servers to high-performance cloud infrastructure.',
            category: 'INFRASTRUCTURE' as any,
            status: 'PLANNING',
            priority: 'MEDIUM',
            projectManagerId: itManager.id,
            startDate: new Date(),
            isRevenueBased: false
        }
    });

    // 4. Create Tasks
    console.log('✅ Creating Tasks...');
    const tasks = [
        {
            title: 'Design Multi-language Database Schema',
            description: 'Create tables and relations to support i18n for submission metadata.',
            status: 'COMPLETED',
            priority: 'HIGH',
            type: 'REVENUE',
            assignedToId: dev1.id,
            projectId: project1.id,
            actualHours: 12,
            itRevenueEarned: 25000,
            isRevenueBased: true
        },
        {
            title: 'Implement Language Switching UI',
            description: 'Frontend components for choosing and persisting language preferences.',
            status: 'IN_PROGRESS',
            priority: 'MEDIUM',
            type: 'REVENUE',
            assignedToId: dev2.id,
            projectId: project1.id,
            estimatedHours: 20
        },
        {
            title: 'Cloud Vendor Evaluation',
            description: 'Compare AWS, Azure, and GCP for our specific load requirements.',
            status: 'PENDING',
            priority: 'HIGH',
            type: 'SUPPORT',
            assignedToId: dev1.id,
            projectId: project2.id
        },
        {
            title: 'Bug: Fix Login Loop on Mobile',
            description: 'Users on iOS are experiencing a redirect loop after OAuth success.',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            type: 'URGENT',
            assignedToId: dev1.id
        }
    ];

    for (const task of tasks) {
        await (prisma as any).iTTask.create({
            data: {
                ...task,
                companyId: company.id,
                taskCode: `TSK-IT-${Math.floor(1000 + Math.random() * 9000)}`,
                createdById: itManager.id
            }
        });
    }

    // 5. Create Time Entries for trends
    console.log('⏰ Creating Time Entries...');
    const now = new Date();
    for (let i = 0; i < 15; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        await (prisma as any).iTTimeEntry.create({
            data: {
                companyId: company.id,
                userId: i % 2 === 0 ? dev1.id : dev2.id,
                projectId: project1.id,
                date: date,
                hours: 4 + Math.random() * 4,
                description: 'Working on portal features',
                isBillable: true
            }
        });
    }

    console.log('✅ IT Seeding completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
