/**
 * Pure aggregation for the revenue-share internal P&L report — no I/O, unit-testable.
 * The DB-bound getDepartmentShareReport in ./revenue-share-report fetches the inputs
 * (shares, gross-by-department, departments) and calls into here.
 */

export interface DepartmentShareRow {
    departmentId: string;
    departmentName: string;
    companyId: string;
    companyName: string;
    departmentType: string;
    grossRevenue: number;
    sharesOut: number;
    residualKept: number;
    sharesIn: number;
    netAttributed: number;
}

export interface DepartmentShareReport {
    month: number;
    year: number;
    locked: boolean; // true when every share row in the period is locked
    rows: DepartmentShareRow[];
    totals: { grossRevenue: number; sharesOut: number; residualKept: number; sharesIn: number; netAttributed: number };
}

export interface ShareLite {
    beneficiaryDepartmentId: string;
    sourceDepartmentId: string | null;
    amount: number;
    isResidual: boolean;
    isLocked: boolean;
}

export interface DeptLite {
    id: string;
    name: string;
    departmentType: string;
    companyId: string;
    companyName: string;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function aggregateDepartmentShares(input: {
    month: number;
    year: number;
    shares: ShareLite[];
    grossByDept: Record<string, number>;
    departments: DeptLite[];
}): DepartmentShareReport {
    const { month, year, shares, grossByDept, departments } = input;

    const sharesIn = new Map<string, number>();
    const residualKept = new Map<string, number>();
    const sharesOut = new Map<string, number>();
    // "Locked" only means something when there is something to lock.
    let allLocked = shares.length > 0;

    for (const s of shares) {
        if (!s.isLocked) allLocked = false;
        if (s.isResidual) {
            residualKept.set(s.beneficiaryDepartmentId, (residualKept.get(s.beneficiaryDepartmentId) || 0) + s.amount);
        } else {
            sharesIn.set(s.beneficiaryDepartmentId, (sharesIn.get(s.beneficiaryDepartmentId) || 0) + s.amount);
            if (s.sourceDepartmentId) {
                sharesOut.set(s.sourceDepartmentId, (sharesOut.get(s.sourceDepartmentId) || 0) + s.amount);
            }
        }
    }

    const rows: DepartmentShareRow[] = departments
        .map((d) => {
            const grossRevenue = round(grossByDept[d.id] || 0);
            const out = round(sharesOut.get(d.id) || 0);
            const residual = round(residualKept.get(d.id) || 0);
            const inn = round(sharesIn.get(d.id) || 0);
            return {
                departmentId: d.id,
                departmentName: d.name,
                companyId: d.companyId,
                companyName: d.companyName,
                departmentType: d.departmentType,
                grossRevenue,
                sharesOut: out,
                residualKept: residual,
                sharesIn: inn,
                netAttributed: round(residual + inn),
            };
        })
        // Only show departments with activity in the period.
        .filter((r) => r.grossRevenue || r.sharesOut || r.residualKept || r.sharesIn)
        .sort((a, b) => b.netAttributed - a.netAttributed);

    const totals = rows.reduce(
        (t, r) => ({
            grossRevenue: round(t.grossRevenue + r.grossRevenue),
            sharesOut: round(t.sharesOut + r.sharesOut),
            residualKept: round(t.residualKept + r.residualKept),
            sharesIn: round(t.sharesIn + r.sharesIn),
            netAttributed: round(t.netAttributed + r.netAttributed),
        }),
        { grossRevenue: 0, sharesOut: 0, residualKept: 0, sharesIn: 0, netAttributed: 0 },
    );

    return { month, year, locked: allLocked, rows, totals };
}
