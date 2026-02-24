import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

// Removed local PrismaClient initialization to use the centralized one

async function main() {
    console.log('🌱 Starting seed...');

    // Clear existing data (including new modules)
    console.log('🗑️  Clearing existing data...');
    // HR & Recruitment
    await prisma.notification.deleteMany();
    await prisma.pushSubscription.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.supportTicket.deleteMany();
    await prisma.task.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.chatParticipant.deleteMany();
    await prisma.chatRoom.deleteMany();
    await prisma.communicationLog.deleteMany();

    // Recruitment
    await prisma.examAttempt.deleteMany();
    await prisma.jobApplication.deleteMany();
    await prisma.jobPosting.deleteMany();
    await prisma.recruitmentExam.deleteMany();

    // Supply Chain
    await prisma.productionOrder.deleteMany();
    await prisma.inventoryItem.deleteMany();

    // HR Core
    await prisma.salarySlip.deleteMany();
    await prisma.leaveRequest.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.employeeDocument.deleteMany();
    await prisma.workReport.deleteMany();
    await prisma.performanceReview.deleteMany();
    await prisma.employeeProfile.deleteMany();

    // Sales & Core
    await prisma.payment.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.subscriptionItem.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.journal.deleteMany();
    await prisma.agencyDetails.deleteMany();
    await prisma.institutionDetails.deleteMany();
    await prisma.customerProfile.deleteMany();
    await prisma.user.deleteMany();
    await (prisma as any).department.deleteMany();
    await (prisma as any).company.deleteMany();

    // Hash password for all users
    const hashedPassword = await bcrypt.hash('password123', 12);

    // 34. Create Company
    console.log('🏢 Creating company...');
    const company = await (prisma as any).company.create({
        data: {
            name: 'STM Journals Inc',
            domain: 'stm.com',
            address: '123 Publishing Way, New York, NY',
            phone: '+1-212-555-0199',
            email: 'contact@stm.com',
            website: 'https://stm.com',
        }
    });

    // 1. Create Super Admin
    console.log('👤 Creating users...');
    const superAdmin = await (prisma.user as any).create({
        data: {
            email: 'admin@stm.com',
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            emailVerified: true,
            companyId: company.id,
            customerProfile: {
                create: {
                    customerType: 'INDIVIDUAL',
                    name: 'Admin User',
                    primaryEmail: 'admin@stm.com',
                    primaryPhone: '+1-555-0001',
                    companyId: company.id,
                    country: 'United States',
                } as any,
            },
            employeeProfile: {
                create: {
                    designation: 'Super Admin',
                    dateOfJoining: new Date(),
                } as any,
            },
        },
    });

    // 3. Create Manager
    const manager = await (prisma.user as any).create({
        data: {
            email: 'manager@stm.com',
            password: hashedPassword,
            role: 'MANAGER',
            emailVerified: true,
            companyId: company.id,
            managerId: superAdmin.id, // Reports to Super Admin
            customerProfile: {
                create: {
                    customerType: 'INDIVIDUAL',
                    name: 'Michael Manager',
                    primaryEmail: 'manager@stm.com',
                    primaryPhone: '+1-555-0004',
                    companyId: company.id,
                    country: 'United States',
                },
            },
        },
    });

    // 2. Create Sales Executives (Now managed by Michael Manager)
    const salesExec1 = await (prisma.user as any).create({
        data: {
            email: 'john.sales@stm.com',
            password: hashedPassword,
            role: 'EXECUTIVE',
            emailVerified: true,
            companyId: company.id,
            managerId: manager.id,
            customerProfile: {
                create: {
                    customerType: 'INDIVIDUAL',
                    name: 'John Sales',
                    primaryEmail: 'john.sales@stm.com',
                    primaryPhone: '+1-555-0002',
                    companyId: company.id,
                    country: 'United States',
                },
            },
        },
    });

    const salesExec2 = await (prisma.user as any).create({
        data: {
            email: 'sarah.sales@stm.com',
            password: hashedPassword,
            role: 'EXECUTIVE',
            emailVerified: true,
            companyId: company.id,
            managerId: manager.id,
            customerProfile: {
                create: {
                    customerType: 'INDIVIDUAL',
                    name: 'Sarah Johnson',
                    primaryEmail: 'sarah.sales@stm.com',
                    primaryPhone: '+1-555-0003',
                    companyId: company.id,
                    country: 'United States',
                },
            },
        },
    });

    // 4. Create Finance Admin
    const financeAdmin = await (prisma.user as any).create({
        data: {
            email: 'finance@stm.com',
            password: hashedPassword,
            role: 'FINANCE_ADMIN',
            emailVerified: true,
            companyId: company.id,
            managerId: superAdmin.id,
            customerProfile: {
                create: {
                    customerType: 'INDIVIDUAL',
                    name: 'Finance Admin',
                    primaryEmail: 'finance@stm.com',
                    primaryPhone: '+1-555-0005',
                    companyId: company.id,
                    country: 'United States',
                },
            },
        },
    });

    // 5. Create Agency
    const agency = await (prisma.user as any).create({
        data: {
            email: 'agency@partner.com',
            password: hashedPassword,
            role: 'AGENCY',
            emailVerified: true,
            companyId: company.id,
            customerProfile: {
                create: {
                    customerType: 'AGENCY',
                    name: 'Global Subscription Partners',
                    organizationName: 'Global Subscription Partners LLC',
                    primaryEmail: 'agency@partner.com',
                    primaryPhone: '+1-555-0006',
                    companyId: company.id,
                    country: 'United States',
                    agencyDetails: {
                        create: {
                            companyInfo: 'Leading subscription agency in North America',
                            territory: 'North America',
                            region: 'USA & Canada',
                            commissionTerms: '15% on new subscriptions, 10% on renewals',
                        },
                    },
                },
            },
        },
    });

    // 6. Create Departments
    console.log('🏢 Creating departments...');
    const salesDept = await (prisma as any).department.create({
        data: {
            companyId: company.id,
            name: 'Sales Department',
            code: 'SALES',
            description: 'Customer acquisition and subscription sales',
            headUserId: manager.id,
            isActive: true
        }
    });

    const financeDept = await (prisma as any).department.create({
        data: {
            companyId: company.id,
            name: 'Finance Department',
            code: 'FIN',
            description: 'Financial operations, invoicing, and payments',
            headUserId: financeAdmin.id,
            isActive: true
        }
    });

    const supportDept = await (prisma as any).department.create({
        data: {
            companyId: company.id,
            name: 'Customer Support',
            code: 'SUPPORT',
            description: 'Customer service and technical support',
            isActive: true
        }
    });

    // Assign users to departments
    await (prisma.user as any).update({
        where: { id: salesExec1.id },
        data: { departmentId: salesDept.id }
    });

    await (prisma.user as any).update({
        where: { id: salesExec2.id },
        data: { departmentId: salesDept.id }
    });

    await (prisma.user as any).update({
        where: { id: manager.id },
        data: { departmentId: salesDept.id }
    });

    await (prisma.user as any).update({
        where: { id: financeAdmin.id },
        data: { departmentId: financeDept.id }
    });

    // 7. Create Institution Customers
    const institutions = [];
    const institutionData = [
        {
            email: 'library@mit.edu',
            name: 'Dr. Emily Carter',
            orgName: 'MIT Libraries',
            category: 'University',
            country: 'United States',
            city: 'Cambridge',
        },
        {
            email: 'library@stanford.edu',
            name: 'Prof. David Chen',
            orgName: 'Stanford University Libraries',
            category: 'University',
            country: 'United States',
            city: 'Stanford',
        },
        {
            email: 'library@harvard.edu',
            name: 'Dr. Rebecca Wilson',
            orgName: 'Harvard Medical Library',
            category: 'University',
            country: 'United States',
            city: 'Boston',
        },
        {
            email: 'library@yale.edu',
            name: 'Dr. James Thompson',
            orgName: 'Yale University Library',
            category: 'University',
            country: 'United States',
            city: 'New Haven',
        },
        {
            email: 'library@oxford.ac.uk',
            name: 'Dr. Margaret Anderson',
            orgName: 'Oxford University',
            category: 'University',
            country: 'United Kingdom',
            city: 'Oxford',
        },
    ];

    for (const inst of institutionData) {
        const institution: any = await (prisma.user as any).create({
            data: {
                email: inst.email,
                password: hashedPassword,
                role: 'CUSTOMER',
                emailVerified: true,
                companyId: company.id,
                customerProfile: {
                    create: {
                        customerType: 'INSTITUTION',
                        name: inst.name,
                        organizationName: inst.orgName,
                        primaryEmail: inst.email,
                        primaryPhone: `+1-555-${1000 + institutions.length}`,
                        companyId: company.id,
                        country: inst.country,
                        city: inst.city,
                        billingAddress: `${inst.orgName}, ${inst.city}`,
                        assignedToUserId: institutions.length % 2 === 0 ? salesExec1.id : salesExec2.id,
                        institutionDetails: {
                            create: {
                                category: inst.category,
                                numberOfUsers: Math.floor(Math.random() * 5000) + 1000,
                                numberOfSeats: Math.floor(Math.random() * 500) + 100,
                            },
                        },
                    },
                },
            },
        });
        institutions.push(institution);
    }

    // 7. Create Individual Customers
    const individuals = [];
    const individualData = [
        { email: 'researcher1@email.com', name: 'Dr. Alice Brown', country: 'United States' },
        { email: 'researcher2@email.com', name: 'Dr. Robert Miller', country: 'Canada' },
        { email: 'researcher3@email.com', name: 'Dr. Linda Davis', country: 'United Kingdom' },
    ];

    for (const ind of individualData) {
        const individual: any = await (prisma.user as any).create({
            data: {
                email: ind.email,
                password: hashedPassword,
                role: 'CUSTOMER',
                emailVerified: true,
                companyId: company.id,
                customerProfile: {
                    create: {
                        customerType: 'INDIVIDUAL',
                        name: ind.name,
                        primaryEmail: ind.email,
                        primaryPhone: `+1-555-${2000 + individuals.length}`,
                        companyId: company.id,
                        country: ind.country,
                        assignedToUserId: individuals.length % 2 === 0 ? salesExec1.id : salesExec2.id,
                    },
                },
            },
        });
        individuals.push(individual);
    }

    // 8. Create Journals
    console.log('📰 Creating journals...');
    const journals = [];
    const journalData = [
        {
            name: 'Nature Journal',
            issnPrint: '0028-0836',
            issnOnline: '1476-4687',
            frequency: 'Weekly',
            formats: ['Print', 'Online', 'Hybrid'],
            subjects: ['Science', 'Research', 'Biology'],
            price: 5200,
        },
        {
            name: 'Science Direct Collection',
            issnPrint: '0036-8075',
            issnOnline: '1095-9203',
            frequency: 'Weekly',
            formats: ['Online', 'Hybrid'],
            subjects: ['Science', 'Technology', 'Medicine'],
            price: 8500,
        },
        {
            name: 'The Lancet',
            issnPrint: '0140-6736',
            issnOnline: '1474-547X',
            frequency: 'Weekly',
            formats: ['Print', 'Online', 'Hybrid'],
            subjects: ['Medicine', 'Health', 'Research'],
            price: 3800,
        },
        {
            name: 'IEEE Transactions Bundle',
            issnPrint: '0018-9219',
            issnOnline: '1558-2256',
            frequency: 'Monthly',
            formats: ['Online'],
            subjects: ['Engineering', 'Technology', 'Computer Science'],
            price: 4500,
        },
        {
            name: 'JAMA Network',
            issnPrint: '0098-7484',
            issnOnline: '1538-3598',
            frequency: 'Weekly',
            formats: ['Print', 'Online', 'Hybrid'],
            subjects: ['Medicine', 'Healthcare'],
            price: 3200,
        },
    ];

    for (const j of journalData) {
        const journal = await prisma.journal.create({
            data: {
                name: j.name,
                issnPrint: j.issnPrint,
                issnOnline: j.issnOnline,
                frequency: j.frequency,
                formatAvailable: j.formats.join(','),
                subjectCategory: j.subjects.join(','),
                priceINR: j.price,
                priceUSD: j.price / 84, // Approx conversion
                isActive: true,
            },
        });
        journals.push(journal);

        // Create plans for each journal
        await prisma.plan.create({
            data: {
                journalId: journal.id,
                planType: 'Annual',
                format: 'Online',
                duration: 12,
                priceINR: j.price,
                priceUSD: j.price / 84,
                startDateRule: 'immediate',
                gracePeriod: 30,
            },
        });

        await prisma.plan.create({
            data: {
                journalId: journal.id,
                planType: 'Annual',
                format: 'Print',
                duration: 12,
                priceINR: j.price * 1.2,
                priceUSD: (j.price * 1.2) / 84,
                startDateRule: 'immediate',
                gracePeriod: 30,
            },
        });

        await prisma.plan.create({
            data: {
                journalId: journal.id,
                planType: 'Annual',
                format: 'Hybrid',
                duration: 12,
                priceINR: j.price * 1.3,
                priceUSD: (j.price * 1.3) / 84,
                startDateRule: 'immediate',
                gracePeriod: 30,
            },
        });
    }

    // 9. Create Subscriptions
    console.log('📋 Creating subscriptions...');
    const allPlans = await prisma.plan.findMany({ include: { journal: true } });

    // Get customer profiles
    const institutionProfiles = await prisma.customerProfile.findMany({
        where: { customerType: 'INSTITUTION' },
    });

    const agencyProfile = await prisma.customerProfile.findFirst({
        where: { customerType: 'AGENCY' },
        include: { agencyDetails: true },
    });

    // Create active subscriptions for institutions
    for (let i = 0; i < institutionProfiles.length; i++) {
        const profile = institutionProfiles[i];
        const plan = allPlans[i % allPlans.length];
        const isAgency = i % 3 === 0; // Every 3rd subscription is via agency

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 6));

        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);

        const subscription = await (prisma.subscription as any).create({
            data: {
                customerProfileId: profile.id,
                companyId: company.id,
                salesChannel: isAgency ? 'AGENCY' : 'DIRECT',
                agencyId: isAgency ? (agencyProfile as any)?.agencyDetails?.id : null,
                salesExecutiveId: !isAgency ? (i % 2 === 0 ? salesExec1.id : salesExec2.id) : null,
                startDate,
                endDate,
                autoRenew: true,
                status: 'ACTIVE',
                subtotal: plan.priceINR,
                discount: 0,
                tax: plan.priceINR * 0.1,
                total: plan.priceINR * 1.1,
                items: {
                    create: {
                        journalId: plan.journalId,
                        planId: plan.id,
                        quantity: 1,
                        seats: Math.floor(Math.random() * 100) + 50,
                        price: plan.priceINR,
                    },
                },
            },
        });

        // Create invoice for the subscription
        const isPaid = Math.random() > 0.3;
        const invoice = await prisma.invoice.create({
            data: {
                subscriptionId: subscription.id,
                invoiceNumber: `INV-2025-${String(i + 1).padStart(4, '0')}`,
                amount: plan.priceINR,
                tax: plan.priceINR * 0.1,
                total: plan.priceINR * 1.1,
                status: isPaid ? 'PAID' : 'UNPAID',
                dueDate: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000),
                paidDate: isPaid ? new Date(startDate.getTime() + 15 * 24 * 60 * 60 * 1000) : null,
            },
        });

        // Create payment if invoice is paid
        if (invoice.status === 'PAID') {
            await prisma.payment.create({
                data: {
                    invoice: { connect: { id: invoice.id } },
                    amount: invoice.total,
                    paymentMethod: ['card', 'bank-transfer', 'check'][Math.floor(Math.random() * 3)],
                    paymentDate: invoice.paidDate || new Date(),
                    transactionId: `TXN-${Date.now()}-${i}`,
                },
            });
        }
    }

    // Create some renewals due soon
    const renewalProfiles = institutionProfiles.slice(0, 3);
    for (let i = 0; i < renewalProfiles.length; i++) {
        const profile = renewalProfiles[i];
        const plan = allPlans[i];

        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setDate(startDate.getDate() + 15 + (i * 5)); // Due in 15, 20, 25 days

        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);

        await prisma.subscription.create({
            data: {
                customerProfileId: profile.id,
                salesChannel: 'DIRECT',
                salesExecutiveId: salesExec1.id,
                startDate,
                endDate,
                autoRenew: false,
                status: 'ACTIVE',
                subtotal: plan.priceINR,
                discount: plan.priceINR * 0.05,
                tax: plan.priceINR * 0.95 * 0.1,
                total: plan.priceINR * 0.95 * 1.1,
                items: {
                    create: {
                        journalId: plan.journalId,
                        planId: plan.id,
                        quantity: 1,
                        seats: 100,
                        price: plan.priceINR,
                    },
                },
            },
        });
    }

    // 10. Create Communication Logs
    console.log('💬 Creating communication logs...');
    for (let i = 0; i < institutionProfiles.length; i++) {
        const profile = institutionProfiles[i];

        await (prisma.communicationLog as any).create({
            data: {
                customerProfileId: profile.id,
                companyId: company.id,
                userId: salesExec1.id,
                channel: 'Email',
                subject: 'Initial subscription setup',
                notes: 'Discussed subscription requirements and pricing. Customer interested in online access.',
                outcome: 'interested',
                date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
        });

        if (i < 3) {
            await (prisma.communicationLog as any).create({
                data: {
                    customerProfileId: profile.id,
                    companyId: company.id,
                    userId: salesExec1.id,
                    type: 'CALL',
                    channel: 'Phone',
                    duration: 345, // seconds
                    subject: 'Renewal reminder call',
                    notes: 'Called to discuss upcoming renewal. Customer confirmed intent to renew.',
                    outcome: 'renewal-confirmed',
                    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                    nextFollowUpDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                },
            });

            await (prisma.communicationLog as any).create({
                data: {
                    customerProfileId: profile.id,
                    companyId: company.id,
                    userId: financeAdmin.id,
                    type: 'INVOICE_SENT',
                    channel: 'Email',
                    subject: 'Invoice #INV-2025-001',
                    notes: 'Sent invoice for annual subscription renewal.',
                    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                },
            });
        }
    }

    // 11. Create Tasks
    console.log('✅ Creating tasks...');
    const taskData = [
        {
            title: 'Follow up with MIT Library renewal',
            description: 'Renewal due in 15 days. Need to confirm subscription continuation.',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            priority: 'HIGH',
            status: 'PENDING',
            userId: salesExec1.id,
        },
        {
            title: 'Send pricing proposal to Oxford University',
            description: 'They requested a quote for the full journal bundle.',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            priority: 'MEDIUM',
            status: 'IN_PROGRESS',
            userId: salesExec2.id,
        },
        {
            title: 'Process refund for cancelled subscription',
            description: 'Customer cancelled mid-term. Calculate prorated refund.',
            dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            priority: 'URGENT',
            status: 'PENDING',
            userId: financeAdmin.id,
        },
    ];

    for (const task of taskData) {
        await (prisma.task as any).create({
            data: {
                ...task,
                companyId: company.id
            }
        });
    }

    // 12. Create Audit Logs
    console.log('📜 Creating audit logs...');
    await prisma.auditLog.create({
        data: {
            userId: superAdmin.id,
            action: 'create',
            entity: 'journal',
            entityId: journals[0].id,
            changes: { name: journals[0].name },
        },
    });

    console.log('✅ Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Users: ${await prisma.user.count()}`);
    console.log(`- Customer Profiles: ${await prisma.customerProfile.count()}`);
    console.log(`- Journals: ${await prisma.journal.count()}`);
    console.log(`- Plans: ${await prisma.plan.count()}`);
    console.log(`- Subscriptions: ${await prisma.subscription.count()}`);
    console.log(`- Invoices: ${await prisma.invoice.count()}`);
    console.log(`- Communications: ${await prisma.communicationLog.count()}`);
    console.log(`- Tasks: ${await prisma.task.count()}`);

    console.log('\n🔑 Test Credentials (password for all: password123):');
    console.log('- Super Admin: admin@stm.com');
    console.log('- Sales Exec: john.sales@stm.com');
    console.log('- Manager: manager@stm.com');
    console.log('- Finance: finance@stm.com');
    console.log('- Agency: agency@partner.com');
    // 13. Create Inventory Items (Supply Chain Mock)
    console.log('🏭 Seeding supply chain data...');
    const inventoryItems = [
        { name: 'Printing Paper (A4)', sku: 'RAW-PAP-001', stock: 5000, min: 1000, cat: 'RAW_MATERIAL', price: 0.5 },
        { name: 'Ink Cartridge (Black)', sku: 'RAW-INK-BLK', stock: 50, min: 20, cat: 'RAW_MATERIAL', price: 120 },
        { name: 'Binding Glue', sku: 'RAW-GLU-005', stock: 5, min: 10, cat: 'RAW_MATERIAL', price: 45 }, // Low Stock
        { name: 'Nature Journal (Print Ed.)', sku: 'FG-NAT-2024', stock: 150, min: 200, cat: 'FINISHED_GOOD', price: 15 }, // Low Stock + High Demand
        { name: 'Science Direct (Hardcopy)', sku: 'FG-SCI-2024', stock: 800, min: 100, cat: 'FINISHED_GOOD', price: 25 },
        { name: 'Packaging Boxes', sku: 'PKG-BOX-M', stock: 2000, min: 500, cat: 'PACKAGING', price: 2 },
    ];

    for (const item of inventoryItems) {
        await prisma.inventoryItem.create({
            data: {
                name: item.name,
                sku: item.sku,
                currentStock: item.stock,
                minThreshold: item.min,
                category: item.cat,
                price: item.price
            }
        });
    }

    console.log(`- Inventory Items: ${await prisma.inventoryItem.count()}`);
    console.log('- Super Admin: admin@stm.com');
    console.log('- Sales Exec: john.sales@stm.com');
    console.log('- Manager: manager@stm.com');
    console.log('- Finance: finance@stm.com');
    console.log('- Agency: agency@partner.com');
    console.log('- Customer: library@mit.edu');

    // 14. Create Knowledge Articles (Guideline Hub)
    console.log('📚 Seeding guidelines...');
    const guidelines = [
        {
            id: 'guide-settle-invoice',
            title: 'How to Settle Invoices',
            content: 'To settle an invoice, navigate to the Invoice Detail page, click the "Settle" button, and follow the payment prompts. Ensure the correct currency is selected.',
            category: 'BILLING',
            targetRole: 'ALL'
        },
        {
            id: 'guide-tax-calc',
            title: 'Tax Calculation Guidelines',
            content: 'Domestic invoices are subject to 18% GST. International invoices are non-taxable (0%). Always verify the customer region before finalizing prices.',
            category: 'BILLING',
            targetRole: 'ALL'
        },
        {
            id: 'guide-sub-process',
            title: 'Subscription Creation Process',
            content: 'When creating a subscription, step 1 is selecting the customer. Step 2 requires adding journals/plans. Invoices are auto-generated upon submission.',
            category: 'SUBSCRIPTION',
            targetRole: 'ALL'
        },
        {
            id: 'guide-it-support',
            title: 'IT Support Protocol',
            content: 'For any technical issues, create a support ticket with priority level. Urgent tickets are addressed within 2 hours.',
            category: 'IT',
            targetRole: 'ALL'
        }
    ];

    for (const g of guidelines) {
        await prisma.knowledgeArticle.upsert({
            where: { id: g.id },
            update: { ...g, authorId: superAdmin.id },
            create: { ...g, authorId: superAdmin.id }
        });
    }
    console.log(`- Knowledge Articles: ${await prisma.knowledgeArticle.count()}`);
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
