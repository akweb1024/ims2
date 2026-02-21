import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('🔄 Starting Data Migration: Employee ID & HR Base Upgrades...');

    // 1. Fetch all companies and ensure they have a prefix
    const companies = await prisma.company.findMany();
    for (const company of companies) {
        if (!company.employeeIdPrefix) {
            // Generate a prefix from the company name if none exists
            const prefix = company.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'C') || 'CMP';
            await prisma.company.update({
                where: { id: company.id },
                data: { employeeIdPrefix: prefix }
            });
            console.log(`✅ Assigned prefix ${prefix} to Company ${company.name}`);
        }
    }

    // Refresh companies to get updated prefixes
    const updatedCompanies = await prisma.company.findMany();
    const companyPrefixMap = new Map(updatedCompanies.map(c => [c.id, c.employeeIdPrefix || 'EMP']));

    // 2. Process all employees
    const employees = await prisma.employeeProfile.findMany({
        include: {
            user: { select: { companyId: true, companies: true, role: true, isActive: true } },
            designatRef: { select: { name: true } }
        }
    });

    console.log(`🔍 Found ${employees.length} employees to migrate.`);

    for (const emp of employees) {
        const { id, user, employeeId, designation, designatRef } = emp;
        const targetCompanyId = user.companyId || (user.companies[0]?.id) || null;
        let prefix = 'EMP';

        if (targetCompanyId) {
            prefix = companyPrefixMap.get(targetCompanyId) || 'EMP';
        }

        const updates: any = {};

        // A. Add company prefix to existing employee IDs if not present
        if (employeeId && !employeeId.startsWith(prefix + '-')) {
            // Strip any existing default 'EMP-' prefix if upgrading
            const cleanId = employeeId.replace(/^EMP-/, '');
            updates.employeeId = `${prefix}-${cleanId}`;
        } else if (!employeeId) {
            // Very rare case: no employeeId at all
            updates.employeeId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        // B. Ensure initial leave balances are set
        if (emp.initialLeaveBalance === null || emp.initialLeaveBalance === undefined) {
            updates.initialLeaveBalance = 0;
            // Also ensure current leave balance aligns if missing
            if (emp.currentLeaveBalance === null || emp.currentLeaveBalance === undefined) {
                updates.currentLeaveBalance = emp.leaveBalance || 0;
            }
        }

        if (Object.keys(updates).length > 0) {
            await prisma.employeeProfile.update({
                where: { id },
                data: updates
            });
            console.log(`✅ Updated Profile: ${emp.id} -> New ID: ${updates.employeeId || employeeId}`);
        }

        // C. Create EmployeeCompanyDesignation records for existing employees
        // A user can be in user.companies (multiple) or user.companyId (primary). We add them to their primary company
        if (targetCompanyId) {
            const desName = designatRef?.name || designation || user.role;
            const existingMapping = await prisma.employeeCompanyDesignation.findFirst({
                where: { employeeId: id, companyId: targetCompanyId }
            });

            if (!existingMapping) {
                await prisma.employeeCompanyDesignation.create({
                    data: {
                        employeeId: id,
                        companyId: targetCompanyId,
                        designation: desName || 'Executive',
                        isPrimary: true
                    }
                });
                console.log(`✅ Created Designation Mapping for Employee ${id} in Company ${targetCompanyId}`);
            }
        }
    }

    // 3. Create initial LeaveLedger entries if none exist for current month
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    console.log(`🔍 Ensuring Leave Ledger records for ${curMonth}/${curYear}`);

    for (const emp of employees) {
        if (!emp.user.isActive) continue;

        const existingLedger = await prisma.leaveLedger.findFirst({
            where: { employeeId: emp.id, month: curMonth, year: curYear }
        });

        if (!existingLedger) {
            await prisma.leaveLedger.create({
                data: {
                    employeeId: emp.id,
                    month: curMonth,
                    year: curYear,
                    openingBalance: emp.currentLeaveBalance || 0,
                    autoCredit: 1.5,
                    takenLeaves: 0,
                    lateDeductions: 0,
                    shortLeaveDeductions: 0,
                    closingBalance: (emp.currentLeaveBalance || 0) + 1.5,
                    remarks: 'Initial migration ledger entry'
                }
            });
            console.log(`✅ Created Leave Ledger for Employee ${emp.id}`);
            
            // Update profile with matching new balance
            await prisma.employeeProfile.update({
                 where: { id: emp.id },
                 data: { currentLeaveBalance: (emp.currentLeaveBalance || 0) + 1.5, leaveBalance: (emp.currentLeaveBalance || 0) + 1.5 }
            });
        }
    }

    console.log('🎉 Data Migration Complete!');
}

main()
    .catch(e => {
        console.error('❌ Migration Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
