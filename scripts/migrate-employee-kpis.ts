/**
 * One-shot migration: mirror every existing legacy EmployeeKPI row into the
 * canonical KRA engine (EmployeeGoal via the LEGACY_SYNC bridge), so targets
 * defined through the old KPI config panel appear in the HR KRA console,
 * my-performance, and the workload dashboards.
 *
 * Run:  DATABASE_URL=... npm run kra:migrate-legacy
 *
 * Idempotent: the bridge upserts on (employee, title, period, window), so
 * re-running updates in place. Progress (`current`) only seeds goals that are
 * newly created — existing goal progress is never overwritten. Legacy rows are
 * left untouched (their non-KRA consumers still read them); ongoing writes are
 * kept in sync by the write-through bridge in upsertEmployeeKpis.
 */
import { prisma } from '../src/lib/prisma';
import { syncKpiRowToGoal } from '../src/lib/kra/legacy-sync';

async function main() {
    const kpis = await prisma.employeeKPI.findMany({
        select: {
            id: true, title: true, target: true, current: true, unit: true, period: true, category: true,
            employeeId: true, companyId: true,
            employee: { select: { kra: true, user: { select: { companyId: true, isActive: true } } } },
        },
    });

    let synced = 0, created = 0, skipped = 0;
    for (const kpi of kpis) {
        const companyId = kpi.employee?.user?.companyId ?? kpi.companyId;
        if (!companyId || !kpi.title || !(kpi.target > 0)) { skipped++; continue; }
        if (kpi.employee?.user && kpi.employee.user.isActive === false) { skipped++; continue; }

        const r = await syncKpiRowToGoal(prisma, {
            employeeId: kpi.employeeId,
            companyId,
            kraStatement: kpi.employee?.kra ?? null,
            kpi: {
                id: kpi.id,
                title: kpi.title,
                target: kpi.target,
                current: kpi.current,
                unit: kpi.unit,
                period: kpi.period,
                category: kpi.category,
            },
        });
        synced++;
        if (r.created) created++;
    }

    console.log(`Migrated ${synced} legacy KPI row(s) → EmployeeGoal (${created} goals created, ${synced - created} updated in place, ${skipped} skipped).`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
