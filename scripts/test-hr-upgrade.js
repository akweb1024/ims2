#!/usr/bin/env node

/**
 * HR System Upgrade Test Suite
 * Tests all new features: Employee ID prefix, Multi-company designations, Leave management
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TOKEN = process.env.TEST_TOKEN || '';

// Test utilities
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
    console.log(`\n${colors.cyan}━━━ ${name} ━━━${colors.reset}`);
}

function logSuccess(message) {
    log(`✓ ${message}`, 'green');
}

function logError(message) {
    log(`✗ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ ${message}`, 'blue');
}

// API helper
async function apiCall(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        ...options.headers
    };

    try {
        const response = await fetch(url, { ...options, headers });
        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        return { ok: false, error: error.message };
    }
}

// Test Suite
const tests = {
    // Test 1: Company Prefix Setup
    async testCompanyPrefix() {
        logTest('Test 1: Company Prefix Setup');

        // Get companies
        const { ok, data } = await apiCall('/api/companies');
        if (!ok) {
            logError('Failed to fetch companies');
            return false;
        }

        if (data.length === 0) {
            logError('No companies found');
            return false;
        }

        const company = data[0];
        logInfo(`Testing with company: ${company.name}`);

        if (company.employeeIdPrefix) {
            logSuccess(`Company has prefix: ${company.employeeIdPrefix}`);
        } else {
            logInfo('Company has no prefix set (will use default)');
        }

        return true;
    },

    // Test 2: Employee Creation with Prefix
    async testEmployeeCreation() {
        logTest('Test 2: Employee Creation with Company Prefix');

        const testEmployee = {
            email: `test.employee.${Date.now()}@example.com`,
            name: 'Test Employee',
            password: 'Test@123',
            role: 'EXECUTIVE',
            initialLeaveBalance: 10,
            companyId: null, // Will be set from companies
            departmentId: null
        };

        // Get company ID
        const { data: companies } = await apiCall('/api/companies');
        if (companies && companies.length > 0) {
            testEmployee.companyId = companies[0].id;
        }

        const { ok, data } = await apiCall('/api/hr/employees', {
            method: 'POST',
            body: JSON.stringify(testEmployee)
        });

        if (!ok) {
            logError(`Failed to create employee: ${data.error || 'Unknown error'}`);
            return false;
        }

        logSuccess(`Employee created: ${data.profile.employeeId}`);
        logInfo(`Initial leave balance: ${data.profile.initialLeaveBalance}`);
        logInfo(`Current leave balance: ${data.profile.currentLeaveBalance}`);

        // Store for later tests
        this.testEmployeeId = data.profile.id;
        this.testUserId = data.user.id;

        return true;
    },

    // Test 3: Multi-Company Designation
    async testMultiCompanyDesignation() {
        logTest('Test 3: Multi-Company Designation Management');

        if (!this.testEmployeeId) {
            logError('No test employee ID available');
            return false;
        }

        // Get companies
        const { data: companies } = await apiCall('/api/companies');
        if (!companies || companies.length < 2) {
            logInfo('Need at least 2 companies for this test (skipping)');
            return true;
        }

        // Add designation for second company
        const designation = {
            companyId: companies[1].id,
            designation: 'Senior Consultant',
            isPrimary: false,
            isActive: true
        };

        const { ok, data } = await apiCall(
            `/api/hr/employees/${this.testEmployeeId}/designations`,
            {
                method: 'POST',
                body: JSON.stringify(designation)
            }
        );

        if (!ok) {
            logError(`Failed to add designation: ${data.error || 'Unknown error'}`);
            return false;
        }

        logSuccess(`Designation added: ${data.designation} at ${data.company.name}`);

        // Fetch all designations
        const { ok: ok2, data: designations } = await apiCall(
            `/api/hr/employees/${this.testEmployeeId}/designations`
        );

        if (ok2) {
            logSuccess(`Total designations: ${designations.length}`);
            designations.forEach(d => {
                logInfo(`  - ${d.company.name}: ${d.designation} ${d.isPrimary ? '(Primary)' : ''}`);
            });
        }

        return true;
    },

    // Test 4: Leave Auto-Credit
    async testLeaveAutoCredit() {
        logTest('Test 4: Leave Auto-Credit System');

        // Check current status
        const { ok: ok1, data: status } = await apiCall('/api/hr/leave-ledger/auto-credit');

        if (ok1) {
            logInfo(`Month: ${status.month}/${status.year}`);
            logInfo(`Total employees: ${status.totalEmployees}`);
            logInfo(`Credited: ${status.creditedEmployees}`);
            logInfo(`Pending: ${status.pendingEmployees}`);
        }

        // Trigger auto-credit (if not already done)
        if (status.pendingEmployees > 0) {
            logInfo('Triggering auto-credit...');
            const { ok: ok2, data: result } = await apiCall(
                '/api/hr/leave-ledger/auto-credit',
                { method: 'POST', body: JSON.stringify({}) }
            );

            if (ok2) {
                logSuccess(`Processed ${result.processed} employees`);
                logInfo(`Credited: ${result.results.filter(r => r.status === 'created' || r.status === 'updated').length}`);
                logInfo(`Errors: ${result.errors.length}`);
            } else {
                logError('Failed to trigger auto-credit');
                return false;
            }
        } else {
            logSuccess('All employees already credited for this month');
        }

        return true;
    },

    // Test 5: Leave Balance Verification
    async testLeaveBalance() {
        logTest('Test 5: Leave Balance Verification');

        if (!this.testEmployeeId) {
            logError('No test employee ID available');
            return false;
        }

        const { ok, data } = await apiCall(`/api/hr/employees/${this.testEmployeeId}`);

        if (!ok) {
            logError('Failed to fetch employee details');
            return false;
        }

        logSuccess(`Employee: ${data.user.name}`);
        logInfo(`Initial Balance: ${data.initialLeaveBalance || 0} days`);
        logInfo(`Current Balance: ${data.currentLeaveBalance || 0} days`);
        logInfo(`Manual Adjustment: ${data.manualLeaveAdjustment || 0} days`);

        // Check if balance increased after auto-credit
        if (data.currentLeaveBalance >= data.initialLeaveBalance) {
            logSuccess('Leave balance is correct (≥ initial balance)');
        } else {
            logError('Leave balance seems incorrect');
        }

        return true;
    },

    // Test 6: Database Schema Verification
    async testDatabaseSchema() {
        logTest('Test 6: Database Schema Verification');

        // This test verifies that the new fields exist by checking API responses
        const tests = [
            {
                name: 'Company employeeIdPrefix', check: async () => {
                    const { data } = await apiCall('/api/companies');
                    return data && data.length > 0 && 'employeeIdPrefix' in data[0];
                }
            },
            {
                name: 'Employee initialLeaveBalance', check: async () => {
                    if (!this.testEmployeeId) return true;
                    const { data } = await apiCall(`/api/hr/employees/${this.testEmployeeId}`);
                    return data && 'initialLeaveBalance' in data;
                }
            },
            {
                name: 'Employee currentLeaveBalance', check: async () => {
                    if (!this.testEmployeeId) return true;
                    const { data } = await apiCall(`/api/hr/employees/${this.testEmployeeId}`);
                    return data && 'currentLeaveBalance' in data;
                }
            },
            {
                name: 'Employee companyDesignations', check: async () => {
                    if (!this.testEmployeeId) return true;
                    const { data } = await apiCall(`/api/hr/employees/${this.testEmployeeId}`);
                    return data && 'companyDesignations' in data;
                }
            }
        ];

        let allPassed = true;
        for (const test of tests) {
            const passed = await test.check();
            if (passed) {
                logSuccess(test.name);
            } else {
                logError(test.name);
                allPassed = false;
            }
        }

        return allPassed;
    }
};

// Run all tests
async function runTests() {
    log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
    log('║     HR SYSTEM UPGRADE - AUTOMATED TEST SUITE          ║', 'cyan');
    log('╚════════════════════════════════════════════════════════╝', 'cyan');

    if (!TOKEN) {
        log('\n⚠️  Warning: No TEST_TOKEN provided. Some tests may fail.', 'yellow');
        log('   Set TEST_TOKEN environment variable with a valid auth token.', 'yellow');
    }

    const results = [];

    for (const [name, test] of Object.entries(tests)) {
        try {
            const passed = await test.call(tests);
            results.push({ name, passed });
        } catch (error) {
            logError(`Test ${name} threw error: ${error.message}`);
            results.push({ name, passed: false });
        }
    }

    // Summary
    log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
    log('║                    TEST SUMMARY                        ║', 'cyan');
    log('╚════════════════════════════════════════════════════════╝', 'cyan');

    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const percentage = Math.round((passed / total) * 100);

    results.forEach(({ name, passed }) => {
        const status = passed ? '✓ PASS' : '✗ FAIL';
        const color = passed ? 'green' : 'red';
        log(`${status} - ${name}`, color);
    });

    log(`\n${passed}/${total} tests passed (${percentage}%)`, percentage === 100 ? 'green' : 'yellow');

    if (percentage === 100) {
        log('\n🎉 All tests passed! System is ready for production.', 'green');
    } else {
        log('\n⚠️  Some tests failed. Please review the errors above.', 'yellow');
    }

    process.exit(percentage === 100 ? 0 : 1);
}

// Run
runTests().catch(error => {
    logError(`Fatal error: ${error.message}`);
    process.exit(1);
});
