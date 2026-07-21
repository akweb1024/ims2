/**
 * Provision KRA goals (EmployeeGoal, isKra=true) for IT, Publication, and
 * Sales & Marketing employees from the matching KRA/KPI template — so the
 * performance and workload dashboards have real goals to show.
 *
 * Employees are matched by role. IT staff get the cross-department
 * "IT & Infrastructure" template (they support every department's in-house
 * team). Managers get the MANAGER template variant, individual contributors
 * the INDIVIDUAL one.
 *
 * Run against the database you want provisioned:
 *   DATABASE_URL=... npx tsx scripts/seed-kra-goals.ts
 *   DATABASE_URL=... KRA_SEED_ZERO=true npx tsx scripts/seed-kra-goals.ts   # targets only, current=0
 *
 * Idempotent: goals are upserted by (employeeId, title), so re-running updates
 * in place rather than duplicating, and never touches unrelated goals.
 */
import { prisma } from '../src/lib/prisma';
import { KRA_KPI_TEMPLATES } from '../src/lib/performance/kra-kpi-templates';

type RoleType = 'INDIVIDUAL' | 'MANAGER';
const ROLE_MAP: Record<string, { family: string; roleType: RoleType }> = {
  // IT — cross-department support function
  IT_MANAGER: { family: 'IT & Infrastructure', roleType: 'MANAGER' },
  IT_ADMIN: { family: 'IT & Infrastructure', roleType: 'INDIVIDUAL' },
  // Publication
  JOURNAL_MANAGER: { family: 'Publication & Production', roleType: 'MANAGER' },
  EDITOR_IN_CHIEF: { family: 'Publication & Production', roleType: 'MANAGER' },
  EDITOR: { family: 'Publication & Production', roleType: 'INDIVIDUAL' },
  SECTION_EDITOR: { family: 'Publication & Production', roleType: 'INDIVIDUAL' },
  REVIEWER: { family: 'Publication & Production', roleType: 'INDIVIDUAL' },
  PLAGIARISM_CHECKER: { family: 'Publication & Production', roleType: 'INDIVIDUAL' },
  QUALITY_CHECKER: { family: 'Publication & Production', roleType: 'INDIVIDUAL' },
  // Sales & Marketing (staff are modeled as EXECUTIVE)
  EXECUTIVE: { family: 'Sales & Marketing', roleType: 'INDIVIDUAL' },
};

// Spread of progress so the dashboards show a realistic mix of states.
const FRACTIONS = [0.9, 0.72, 1.0, 0.6, 0.85, 0.65, 0.95, 0.78, 0.55];
const ZERO = process.env.KRA_SEED_ZERO === 'true';

const findTemplate = (family: string, roleType: RoleType) =>
  KRA_KPI_TEMPLATES.find((t) => t.family === family && t.roleType === roleType);

async function main() {
  const now = new Date();
  const startDate = new Date(now.getTime() - 30 * 86_400_000);
  const endDate = new Date(now.getTime() + 180 * 86_400_000);

  const users = await prisma.user.findMany({
    where: { role: { in: Object.keys(ROLE_MAP) }, employeeProfile: { isNot: null } },
    select: { id: true, name: true, role: true, companyId: true, employeeProfile: { select: { id: true } } },
  });

  const perFamily: Record<string, number> = {};
  let goalsWritten = 0, employees = 0, skipped = 0;

  for (const u of users) {
    const map = ROLE_MAP[u.role];
    const template = map && findTemplate(map.family, map.roleType);
    if (!template) { skipped++; continue; }
    if (!u.companyId) { console.warn(`  skip ${u.name} (${u.role}) — no companyId`); skipped++; continue; }
    const employeeId = u.employeeProfile!.id;
    employees++;
    perFamily[map.family] = (perFamily[map.family] ?? 0) + 1;

    for (let i = 0; i < template.kpis.length; i++) {
      const kpi = template.kpis[i];
      const current = ZERO ? 0 : Math.round(kpi.target * FRACTIONS[i % FRACTIONS.length]);
      const achievement = kpi.target > 0 ? Math.min(100, Math.round((current / kpi.target) * 100)) : 0;
      const shared = {
        targetValue: kpi.target,
        unit: kpi.unit,
        type: kpi.period as any,
        currentValue: current,
        achievementPercentage: achievement,
        isKra: true,
        kra: template.kra,
      };
      const existing = await prisma.employeeGoal.findFirst({
        where: { employeeId, title: kpi.title }, select: { id: true },
      });
      if (existing) {
        await prisma.employeeGoal.update({ where: { id: existing.id }, data: shared });
      } else {
        await prisma.employeeGoal.create({
          data: {
            employeeId, companyId: u.companyId, title: kpi.title,
            startDate, endDate, status: 'IN_PROGRESS', visibility: 'MANAGER', ...shared,
          },
        });
      }
      goalsWritten++;
    }
  }

  console.log(`\nProvisioned KRA goals for ${employees} employee(s), ${goalsWritten} goals${ZERO ? ' (targets only)' : ''}.`);
  for (const [fam, n] of Object.entries(perFamily)) console.log(`  ${fam}: ${n} employee(s)`);
  if (skipped) console.log(`  (skipped ${skipped} without a template match / companyId)`);
  if (employees === 0) console.log('  No matching employees found — check that IT/publication/sales users exist with employee profiles.');
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
