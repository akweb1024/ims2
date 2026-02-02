import { prisma } from './src/lib/prisma';

async function validateEmployeeSync() {
    console.log('🔍 Starting Employee Data Synchronization Validation\n');

    const results = {
        idResolution: { passed: 0, failed: 0 },
        salaryStructure: { passed: 0, failed: 0 },
        employeeKPI: { passed: 0, failed: 0 },
        designation: { passed: 0, failed: 0 }
    };

    try {
        // 1. Test ID Resolution
        console.log('📋 Test 1: ID Resolution Consistency');
        console.log('─'.repeat(50));

        const testEmployee = await prisma.employeeProfile.findFirst({
            include: { user: true }
        });

        if (testEmployee) {
            // Test resolving by User ID
            const byUserId = await prisma.employeeProfile.findFirst({
                where: {
                    OR: [
                        { id: testEmployee.user.id },
                        { userId: testEmployee.user.id }
                    ]
                }
            });

            // Test resolving by Profile ID
            const byProfileId = await prisma.employeeProfile.findFirst({
                where: {
                    OR: [
                        { id: testEmployee.id },
                        { userId: testEmployee.id }
                    ]
                }
            });

            if (byUserId?.id === testEmployee.id && byProfileId?.id === testEmployee.id) {
                console.log('✅ ID Resolution: PASSED');
                console.log(`   - User ID (${testEmployee.user.id}) resolves to Profile ID: ${byUserId.id}`);
                console.log(`   - Profile ID (${testEmployee.id}) resolves to Profile ID: ${byProfileId.id}`);
                results.idResolution.passed++;
            } else {
                console.log('❌ ID Resolution: FAILED');
                results.idResolution.failed++;
            }
        }

        // 2. Test SalaryStructure Sync
        console.log('\n📋 Test 2: SalaryStructure Synchronization');
        console.log('─'.repeat(50));

        const employeesWithSalary = await prisma.employeeProfile.findMany({
            where: {
                baseSalary: { gt: 0 }
            },
            include: {
                salaryStructure: true
            },
            take: 5
        });

        for (const emp of employeesWithSalary) {
            if (emp.salaryStructure) {
                const expectedBasic = (emp.baseSalary || 0) * 0.4;
                const actualBasic = emp.salaryStructure.basicSalary;
                const tolerance = 1; // Allow 1 rupee difference for rounding

                if (Math.abs(expectedBasic - actualBasic) <= tolerance) {
                    console.log(`✅ Employee ${emp.employeeId}: SalaryStructure synced correctly`);
                    console.log(`   - Base: ₹${emp.baseSalary}, Basic: ₹${actualBasic}, CTC: ₹${emp.salaryStructure.ctc}`);
                    results.salaryStructure.passed++;
                } else {
                    console.log(`❌ Employee ${emp.employeeId}: SalaryStructure mismatch`);
                    console.log(`   - Expected Basic: ₹${expectedBasic}, Actual: ₹${actualBasic}`);
                    results.salaryStructure.failed++;
                }
            } else {
                console.log(`⚠️  Employee ${emp.employeeId}: No SalaryStructure found (Base: ₹${emp.baseSalary})`);
                results.salaryStructure.failed++;
            }
        }

        // 3. Test EmployeeKPI Sync
        console.log('\n📋 Test 3: EmployeeKPI Record Synchronization');
        console.log('─'.repeat(50));

        const incrementsWithKPI = await prisma.salaryIncrementRecord.findMany({
            where: {
                status: 'APPROVED',
                NOT: {
                    newKPI: null
                }
            },
            include: {
                employeeProfile: {
                    include: {
                        kpis: true
                    }
                }
            },
            take: 3
        });

        for (const increment of incrementsWithKPI) {
            const newKPIs = increment.newKPI as any[];
            const actualKPIs = increment.employeeProfile.kpis;

            if (newKPIs && Array.isArray(newKPIs) && newKPIs.length > 0) {
                if (actualKPIs.length >= newKPIs.length) {
                    console.log(`✅ Employee ${increment.employeeProfile.employeeId}: KPIs synced`);
                    console.log(`   - Expected KPIs: ${newKPIs.length}, Actual: ${actualKPIs.length}`);
                    results.employeeKPI.passed++;
                } else {
                    console.log(`❌ Employee ${increment.employeeProfile.employeeId}: KPI count mismatch`);
                    console.log(`   - Expected: ${newKPIs.length}, Actual: ${actualKPIs.length}`);
                    results.employeeKPI.failed++;
                }
            }
        }

        // 4. Test Designation Consistency
        console.log('\n📋 Test 4: Designation Consistency');
        console.log('─'.repeat(50));

        const employeesWithDesignation = await prisma.employeeProfile.findMany({
            where: {
                designation: { not: null }
            },
            include: {
                companyDesignations: true,
                user: { select: { companyId: true } }
            },
            take: 5
        });

        for (const emp of employeesWithDesignation) {
            const primaryCompanyDesignation = emp.companyDesignations.find(cd => cd.isPrimary);

            if (primaryCompanyDesignation && primaryCompanyDesignation.designation === emp.designation) {
                console.log(`✅ Employee ${emp.employeeId}: Designation consistent`);
                console.log(`   - Profile: ${emp.designation}, Company: ${primaryCompanyDesignation.designation}`);
                results.designation.passed++;
            } else if (!primaryCompanyDesignation) {
                console.log(`⚠️  Employee ${emp.employeeId}: No primary company designation found`);
                results.designation.failed++;
            } else {
                console.log(`❌ Employee ${emp.employeeId}: Designation mismatch`);
                console.log(`   - Profile: ${emp.designation}, Company: ${primaryCompanyDesignation.designation}`);
                results.designation.failed++;
            }
        }

        // Summary
        console.log('\n' + '═'.repeat(50));
        console.log('📊 VALIDATION SUMMARY');
        console.log('═'.repeat(50));

        const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
        const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);
        const totalTests = totalPassed + totalFailed;

        console.log(`\n✅ Passed: ${totalPassed}/${totalTests}`);
        console.log(`❌ Failed: ${totalFailed}/${totalTests}`);
        console.log(`\nBreakdown:`);
        console.log(`  - ID Resolution: ${results.idResolution.passed} passed, ${results.idResolution.failed} failed`);
        console.log(`  - SalaryStructure: ${results.salaryStructure.passed} passed, ${results.salaryStructure.failed} failed`);
        console.log(`  - EmployeeKPI: ${results.employeeKPI.passed} passed, ${results.employeeKPI.failed} failed`);
        console.log(`  - Designation: ${results.designation.passed} passed, ${results.designation.failed} failed`);

        if (totalFailed === 0) {
            console.log('\n🎉 All synchronization tests passed!');
        } else {
            console.log('\n⚠️  Some tests failed. Review the output above for details.');
        }

    } catch (error) {
        console.error('❌ Validation failed with error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

validateEmployeeSync();
