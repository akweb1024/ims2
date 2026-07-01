/**
 * Shared placeholder hydration for HR letters — used by both the issue endpoint and the
 * live preview, so a preview always matches what the employee actually receives.
 * Salary uses ₹ in the HTML (screen); the PDF renderer converts ₹→"Rs.".
 */

const rupee = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Derived monthly salary components (baseSalary treated as monthly, like grade bands). */
export function salaryBreakup(gross: number) {
    const basic = Math.round(gross * 0.5);
    const hra = Math.round(gross * 0.2);
    const conveyance = Math.min(1600, gross);
    const special = Math.max(0, gross - basic - hra - conveyance);
    return { basic, hra, conveyance, special };
}

function braces(obj: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) out[`{{${k}}}`] = v == null ? '' : String(v);
    return out;
}

/** Placeholder map from a real employee + their company record. */
export function buildLetterVars(employee: any, company: any, customFields?: Record<string, unknown>): Record<string, string> {
    const now = new Date();
    const gross = employee?.baseSalary || 0;
    const b = salaryBreakup(gross);
    return {
        ...braces({
            name: employee?.user?.name || employee?.user?.email,
            email: employee?.user?.email,
            designation: employee?.designation || 'Staff',
            date: now.toLocaleDateString(),
            year: now.getFullYear().toString(),
            employeeId: employee?.employeeId || 'N/A',
            joiningDate: employee?.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : 'N/A',
            salary: gross ? `INR ${gross.toLocaleString()}` : 'N/A',
            address: employee?.address || 'N/A',
            phone: employee?.phoneNumber || 'N/A',
            panNumber: employee?.panNumber || 'N/A',
            aadharNumber: employee?.aadharNumber || 'N/A',
            bankName: employee?.bankName || 'N/A',
            accountNumber: employee?.accountNumber || 'N/A',
            ifscCode: employee?.ifscCode || 'N/A',
            companyName: company?.name || 'The Company',
            companyAddress: company?.address || 'N/A',
            companyReg: company?.registrationNumber || 'N/A',
            companyCin: company?.cinNo || '',
            grossMonthly: gross ? rupee(gross) : 'N/A',
            ctcAnnual: gross ? rupee(gross * 12) : 'N/A',
            basicSalary: gross ? rupee(b.basic) : 'N/A',
            hra: gross ? rupee(b.hra) : 'N/A',
            conveyance: gross ? rupee(b.conveyance) : 'N/A',
            specialAllowance: gross ? rupee(b.special) : 'N/A',
            netMonthly: gross ? rupee(gross) : 'N/A',
        }),
        ...(customFields ? braces(customFields) : {}),
    };
}

/** Sample placeholder map for previewing a template's layout without picking an employee. */
export function sampleLetterVars(company?: any, customFields?: Record<string, unknown>): Record<string, string> {
    const now = new Date();
    const gross = 30000;
    const b = salaryBreakup(gross);
    return {
        ...braces({
            name: 'Sample Employee', email: 'sample@company.com', designation: 'Executive',
            date: now.toLocaleDateString(), year: now.getFullYear().toString(), employeeId: 'EMP-1001',
            joiningDate: now.toLocaleDateString(), salary: `INR ${(gross * 12).toLocaleString()}`,
            address: '123 Sample Street, New Delhi - 110001', phone: '+91 90000 00000',
            panNumber: 'ABCDE1234F', aadharNumber: 'XXXX XXXX 0000',
            bankName: 'Sample Bank', accountNumber: '000011112222', ifscCode: 'SBIN0000000',
            companyName: company?.name || 'Your Company Pvt. Ltd.',
            companyAddress: company?.address || 'Company Address, City - 000000',
            companyReg: company?.registrationNumber || 'REG-000', companyCin: company?.cinNo || 'U00000XX0000XXX000000',
            grossMonthly: rupee(gross), ctcAnnual: rupee(gross * 12), basicSalary: rupee(b.basic),
            hra: rupee(b.hra), conveyance: rupee(b.conveyance), specialAllowance: rupee(b.special), netMonthly: rupee(gross),
        }),
        ...(customFields ? braces(customFields) : {}),
    };
}

/** Replace {{placeholders}} in content. */
export function hydrate(content: string, vars: Record<string, string>): string {
    let out = content;
    for (const [key, val] of Object.entries(vars)) {
        out = out.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), val);
    }
    return out;
}
