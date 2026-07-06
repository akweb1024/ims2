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

type SalaryStructureLike = {
    basicSalary?: number; hra?: number; conveyance?: number; medical?: number;
    specialAllowance?: number; statutoryBonus?: number; otherAllowances?: number;
    grossSalary?: number; pfEmployer?: number; esicEmployer?: number; ctc?: number;
    pfEmployee?: number; esicEmployee?: number; professionalTax?: number; tds?: number;
    gratuity?: number; netSalary?: number;
};

/**
 * Full monthly salary structure derived from gross, mirroring the app's own
 * computation (see hr/employees PATCH) — used only when no SalaryStructure is
 * stored, so the letter still shows a complete, statutorily-consistent table.
 */
function deriveStructure(gross: number): SalaryStructureLike {
    const { basic, hra, conveyance, special } = salaryBreakup(gross);
    const pfEmployee = basic * 0.12;
    const esicEmployee = gross <= 21000 ? gross * 0.0075 : 0;
    const pfEmployer = basic * 0.12;
    const esicEmployer = gross <= 21000 ? gross * 0.0325 : 0;
    const gratuity = basic * 0.0481;
    return {
        basicSalary: basic, hra, conveyance, medical: 0, specialAllowance: special,
        statutoryBonus: 0, otherAllowances: 0, grossSalary: gross,
        pfEmployer, esicEmployer, ctc: gross + pfEmployer + esicEmployer + gratuity,
        pfEmployee, esicEmployee, professionalTax: 0, tds: 0, gratuity,
        netSalary: gross - pfEmployee - esicEmployee,
    };
}

/** Resolve the salary structure to use: the stored one if populated, else derived from gross. */
function resolveStructure(employee: any): SalaryStructureLike | null {
    const stored = employee?.salaryStructure;
    if (stored && (stored.grossSalary > 0 || stored.ctc > 0)) return stored;
    const gross = employee?.baseSalary || 0;
    return gross > 0 ? deriveStructure(gross) : null;
}

/** Full monthly + annual salary annexure as an HTML <table>, matching the appointment-letter format. */
export function salaryStructureTableHtml(ss: SalaryStructureLike | null): string {
    if (!ss) return '<p><em>Salary structure to be shared separately.</em></p>';
    // [label, monthly amount, always-show?] — zero rows are hidden except key totals.
    const rows: Array<[string, number, boolean?]> = [
        ['Basic + DA', ss.basicSalary || 0, true],
        ['HRA', ss.hra || 0],
        ['Conveyance', ss.conveyance || 0],
        ['Medical', ss.medical || 0],
        ['Statutory Bonus', ss.statutoryBonus || 0],
        ['Special Allowance', ss.specialAllowance || 0],
        ['Other Allowances', ss.otherAllowances || 0],
        ['Gross Salary (A)', ss.grossSalary || 0, true],
        ['Employer PF', ss.pfEmployer || 0],
        ['Employer ESIC', ss.esicEmployer || 0],
        ['Total CTC (A + Employer)', ss.ctc || 0, true],
        ['Employee PF', ss.pfEmployee || 0],
        ['Employee ESI', ss.esicEmployee || 0],
        ['Professional Tax', ss.professionalTax || 0],
        ['TDS', ss.tds || 0],
        ['Gratuity (Retirals)', ss.gratuity || 0],
        ['Monthly Net Pay', ss.netSalary || 0, true],
    ];
    const body = rows
        .filter(([, amt, always]) => always || amt > 0)
        .map(([label, amt]) => `<tr><td>${label}</td><td>${rupee(amt)}</td><td>${rupee(Math.round(amt * 12))}</td></tr>`)
        .join('');
    return `<table><tr><th>Component</th><th>Per Month</th><th>Per Annum</th></tr>${body}</table>`;
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
    const ss = resolveStructure(employee);
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
            grossMonthly: ss ? rupee(ss.grossSalary || gross) : 'N/A',
            ctcAnnual: ss ? rupee((ss.ctc || gross) * 12) : 'N/A',
            basicSalary: ss ? rupee(ss.basicSalary || 0) : 'N/A',
            hra: ss ? rupee(ss.hra || 0) : 'N/A',
            conveyance: ss ? rupee(ss.conveyance || 0) : 'N/A',
            specialAllowance: ss ? rupee(ss.specialAllowance || 0) : 'N/A',
            netMonthly: ss ? rupee(ss.netSalary || gross) : 'N/A',
            salaryStructureTable: salaryStructureTableHtml(ss),
            parentage: '',
            postingLocation: 'Head Office',
            reportDateTime: employee?.dateOfJoining
                ? `${new Date(employee.dateOfJoining).toLocaleDateString()} at 9:00 AM`
                : 'the date of joining at 9:00 AM',
            // Letter-specific fields — best-effort defaults from the record; HR overrides
            // person-specific ones (fees, scope, resignation date) via custom fields.
            pan: employee?.panNumber || 'N/A',
            lastDrawnSalary: gross ? rupee(gross) : 'N/A',
            relievingDate: now.toLocaleDateString(),
            resignationDate: '',
            refNo: `REL/${now.getFullYear()}/${employee?.employeeId || 'XXXX'}`,
            offerValidTill: new Date(now.getTime() + 15 * 86400000).toLocaleDateString(),
            serviceScope: employee?.designation || '',
            paymentStructure: '',
            freelanceFee: '',
            conferenceFee: '',
            collectionFee: '',
        }),
        ...(customFields ? braces(customFields) : {}),
    };
}

/** Sample placeholder map for previewing a template's layout without picking an employee. */
export function sampleLetterVars(company?: any, customFields?: Record<string, unknown>): Record<string, string> {
    const now = new Date();
    const gross = 30000;
    const ss = deriveStructure(gross);
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
            grossMonthly: rupee(ss.grossSalary || gross), ctcAnnual: rupee((ss.ctc || gross) * 12), basicSalary: rupee(ss.basicSalary || 0),
            hra: rupee(ss.hra || 0), conveyance: rupee(ss.conveyance || 0), specialAllowance: rupee(ss.specialAllowance || 0), netMonthly: rupee(ss.netSalary || gross),
            salaryStructureTable: salaryStructureTableHtml(ss),
            parentage: 'D/O Sample Parent', postingLocation: 'Noida', reportDateTime: `${now.toLocaleDateString()} at 9:00 AM`,
            pan: 'ABCDE1234F', lastDrawnSalary: rupee(gross),
            relievingDate: now.toLocaleDateString(), resignationDate: now.toLocaleDateString(),
            refNo: 'EXP/2026/EMP-1001', offerValidTill: new Date(now.getTime() + 15 * 86400000).toLocaleDateString(),
            serviceScope: 'Content Editing & Proofreading', paymentStructure: 'As per the agreed output schedule',
            freelanceFee: '₹700', conferenceFee: '₹550', collectionFee: '₹300',
        }),
        ...(customFields ? braces(customFields) : {}),
    };
}

/**
 * Canonical list of shortcodes available in letter templates, grouped for the
 * editor palette. Keep in sync with the keys emitted by buildLetterVars.
 */
export const LETTER_SHORTCODES: { group: string; items: { key: string; label: string }[] }[] = [
    {
        group: 'Employee',
        items: [
            { key: 'name', label: 'Full name' },
            { key: 'parentage', label: 'Parentage (S/O · D/O)' },
            { key: 'designation', label: 'Designation' },
            { key: 'employeeId', label: 'Employee ID' },
            { key: 'address', label: 'Address' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'joiningDate', label: 'Joining date' },
            { key: 'panNumber', label: 'PAN' },
            { key: 'aadharNumber', label: 'Aadhaar' },
            { key: 'bankName', label: 'Bank name' },
            { key: 'accountNumber', label: 'Account no.' },
            { key: 'ifscCode', label: 'IFSC' },
        ],
    },
    {
        group: 'Company',
        items: [
            { key: 'companyName', label: 'Company name' },
            { key: 'companyAddress', label: 'Company address' },
            { key: 'companyReg', label: 'Registration no.' },
            { key: 'companyCin', label: 'CIN' },
        ],
    },
    {
        group: 'Salary',
        items: [
            { key: 'salaryStructureTable', label: 'Full salary annexure (table)' },
            { key: 'ctcAnnual', label: 'CTC (annual)' },
            { key: 'grossMonthly', label: 'Gross (monthly)' },
            { key: 'basicSalary', label: 'Basic + DA' },
            { key: 'hra', label: 'HRA' },
            { key: 'conveyance', label: 'Conveyance' },
            { key: 'specialAllowance', label: 'Special allowance' },
            { key: 'netMonthly', label: 'Net pay (monthly)' },
        ],
    },
    {
        group: 'Letter',
        items: [
            { key: 'date', label: "Today's date" },
            { key: 'year', label: 'Year' },
            { key: 'postingLocation', label: 'Posting location' },
            { key: 'reportDateTime', label: 'Report date & time' },
            { key: 'refNo', label: 'Reference no.' },
            { key: 'offerValidTill', label: 'Offer valid till' },
            { key: 'serviceScope', label: 'Service scope' },
            { key: 'relievingDate', label: 'Relieving date' },
            { key: 'resignationDate', label: 'Resignation date' },
        ],
    },
];

/** Replace {{placeholders}} in content. */
export function hydrate(content: string, vars: Record<string, string>): string {
    let out = content;
    for (const [key, val] of Object.entries(vars)) {
        out = out.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), val);
    }
    return out;
}
