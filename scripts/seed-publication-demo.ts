/**
 * Demo data for the "My Publication Workload" page (/dashboard/my-publication-workload).
 *
 * Seeds journals across domains managed by one user, issues with varied planned
 * release dates, articles at every pipeline stage, stage assignments (overdue /
 * today / upcoming), today's published-rejected transitions, and KRA goals — so
 * the page renders fully populated for that user.
 *
 * Run against whatever database you want populated:
 *   DATABASE_URL=... DEMO_USER_EMAIL=admin@stm.com npx tsx scripts/seed-publication-demo.ts
 *
 * Idempotent: re-running clears the previous demo data first. All demo rows are
 * tagged ("[Demo] " journals, "DEMO-" manuscript ids, "DEMO_" domain codes,
 * "demo_pub_" metric keys, "[Demo]" goal titles) so cleanup never touches real data.
 */
import { prisma } from '../src/lib/prisma';

const EMAIL = process.env.DEMO_USER_EMAIL || 'admin@stm.com';
const day = 86_400_000;
const at = (offsetDays: number) => new Date(Date.now() + offsetDays * day);

type MS =
  | 'SUBMITTED' | 'INITIAL_REVIEW' | 'PLAGIARISM_CHECK' | 'UNDER_REVIEW' | 'QUALITY_CHECK'
  | 'REVISION_REQUIRED' | 'ACCEPTED' | 'COPYRIGHT_CHECK' | 'FORMATTING' | 'GALLEY_PROOF'
  | 'PUBLISHED' | 'REJECTED';

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: EMAIL },
    select: { id: true, companyId: true, name: true, employeeProfile: { select: { id: true } } },
  });
  if (!user) throw new Error(`No user with email ${EMAIL}. Set DEMO_USER_EMAIL to an existing user.`);
  if (!user.companyId) throw new Error(`User ${EMAIL} has no companyId.`);
  const companyId = user.companyId;

  // Ensure the user has an EmployeeProfile (the workload view keys off it).
  let profileId = user.employeeProfile?.id;
  if (!profileId) {
    const p = await prisma.employeeProfile.create({
      data: { userId: user.id, designation: 'Publication & Production' } as any,
      select: { id: true },
    });
    profileId = p.id;
  }

  console.log(`Seeding publication demo for ${EMAIL} (profile ${profileId})`);

  // ---- Clean previous demo data (children cascade from Article) ----
  const oldJournals = await prisma.journal.findMany({ where: { name: { startsWith: '[Demo] ' } }, select: { id: true } });
  const oldIds = oldJournals.map((j) => j.id);
  if (oldIds.length) {
    await prisma.article.deleteMany({ where: { journalId: { in: oldIds } } }); // cascades assignments + history
    await prisma.journalIssue.deleteMany({ where: { volume: { journalId: { in: oldIds } } } });
    await prisma.journalVolume.deleteMany({ where: { journalId: { in: oldIds } } });
    await prisma.journal.deleteMany({ where: { id: { in: oldIds } } });
  }
  await prisma.employeeGoal.deleteMany({ where: { employeeId: profileId, title: { startsWith: '[Demo]' } } });
  await prisma.performanceMetricDefinition.deleteMany({ where: { key: { startsWith: 'demo_pub_' } } });
  await prisma.journalDomain.deleteMany({ where: { code: { startsWith: 'DEMO_' } } });

  // ---- KRA metric + goals (the KPI tiles) ----
  const metric = await prisma.performanceMetricDefinition.create({
    data: {
      companyId, scope: 'KRA', key: 'demo_pub_throughput', name: 'Manuscripts Published (demo)',
      unit: 'MANUSCRIPTS', direction: 'HIGHER_BETTER', sourceModule: 'PUBLICATION',
    },
    select: { id: true },
  });
  const goalBase = { employeeId: profileId, companyId, isKra: true, startDate: at(-25), endDate: at(35) };
  await prisma.employeeGoal.createMany({
    data: [
      { ...goalBase, title: '[Demo] Daily production tasks completed', unit: 'TASKS', type: 'DAILY', targetValue: 8, currentValue: 6, achievementPercentage: 75 },
      { ...goalBase, title: '[Demo] Weekly manuscript processing throughput', unit: 'MANUSCRIPTS', type: 'WEEKLY', targetValue: 25, currentValue: 22, achievementPercentage: 88, metricId: metric.id },
      { ...goalBase, title: '[Demo] SLA adherence for publication milestones', unit: 'PERCENT', type: 'MONTHLY', targetValue: 95, currentValue: 96, achievementPercentage: 100 },
      { ...goalBase, title: '[Demo] Rework rate', unit: 'PERCENT_MAX', type: 'MONTHLY', targetValue: 5, currentValue: 3.8, achievementPercentage: 76 },
    ] as any,
  });

  // ---- Domains ----
  const domainSpecs = [
    { name: 'Chemistry (Demo)', code: 'DEMO_CHEM' },
    { name: 'Computer Science (Demo)', code: 'DEMO_CS' },
    { name: 'Medicine (Demo)', code: 'DEMO_MED' },
    { name: 'Economics (Demo)', code: 'DEMO_ECON' },
  ];
  const domains: Record<string, string> = {};
  for (const d of domainSpecs) {
    const row = await prisma.journalDomain.create({ data: d, select: { id: true, code: true } });
    domains[d.code] = row.id;
  }

  // ---- Journals (managed by the user), Volumes, Issues ----
  const journalSpecs = [
    { key: 'CAT', name: '[Demo] Journal of Molecular Catalysis', domain: 'DEMO_CHEM', vol: 18, issue: 4, release: at(10), expected: 6, status: 'IN_PROGRESS' },
    { key: 'MI', name: '[Demo] Indian Journal of Machine Intelligence', domain: 'DEMO_CS', vol: 7, issue: 2, release: at(5), expected: 5, status: 'IN_PROGRESS' },
    { key: 'NEP', name: '[Demo] Review of Clinical Nephrology', domain: 'DEMO_MED', vol: 12, issue: 3, release: at(20), expected: 4, status: 'PLANNED' },
    { key: 'ECON', name: '[Demo] Journal of Applied Econometrics', domain: 'DEMO_ECON', vol: 9, issue: 1, release: at(-3), expected: 4, status: 'PLANNED' },
  ];
  const journals: Record<string, { id: string; issueId: string }> = {};
  for (const j of journalSpecs) {
    const journal = await prisma.journal.create({
      data: {
        name: j.name, frequency: 'MONTHLY', journalManagerId: user.id,
        domainId: domains[j.domain], linkedMetricId: metric.id,
      },
      select: { id: true },
    });
    const volume = await prisma.journalVolume.create({
      data: { journalId: journal.id, volumeNumber: j.vol, year: 2026 },
      select: { id: true },
    });
    const issue = await prisma.journalIssue.create({
      data: {
        volumeId: volume.id, issueNumber: j.issue, month: 'July', status: j.status,
        plannedReleaseAt: j.release, expectedManuscripts: j.expected,
      },
      select: { id: true },
    });
    journals[j.key] = { id: journal.id, issueId: issue.id };
  }

  // ---- Articles across pipeline stages (some assigned to the user) ----
  let seq = 0;
  const mkArticle = async (journalKey: string, status: MS, opts: { assign?: { stage: MS; due: Date }; inIssue?: boolean; publishedToday?: boolean; rejectedToday?: boolean } = {}) => {
    seq += 1;
    const j = journals[journalKey];
    const titles: Record<string, string[]> = {
      CAT: ['Ligand-exchange kinetics in Pd(II) pincer complexes', 'Solvent effects on asymmetric hydrogenation yield', 'Photoredox catalysis for C–N coupling'],
      MI: ['Sparse attention routing for long-context retrieval', 'Federated fine-tuning under client drift', 'A benchmark for compositional visual reasoning'],
      NEP: ['Biomarkers for early AKI after cardiac surgery', 'Dialysis adequacy and long-term outcomes'],
      ECON: ['Instrument selection under weak identification', 'Nowcasting inflation with mixed-frequency data'],
    };
    const pool = titles[journalKey];
    const article = await prisma.article.create({
      data: {
        title: pool[seq % pool.length],
        journalId: j.id,
        manuscriptId: `DEMO-${String(seq).padStart(4, '0')}`,
        manuscriptStatus: status,
        issueId: opts.inIssue ? j.issueId : undefined,
      },
      select: { id: true },
    });
    if (opts.assign) {
      await prisma.stageAssignment.create({
        data: {
          articleId: article.id, stage: opts.assign.stage, assigneeId: user.id, assignedById: user.id,
          status: 'PENDING', dueDate: opts.assign.due, assignedAt: at(-3),
        },
      });
    }
    if (opts.publishedToday || opts.rejectedToday) {
      await prisma.manuscriptStatusHistory.create({
        data: { articleId: article.id, toStatus: opts.publishedToday ? 'PUBLISHED' : 'REJECTED', changedBy: user.id },
      });
    }
    return article.id;
  };

  // Work queue: 7 assignments across the 4 domains (overdue / today / upcoming)
  await mkArticle('CAT', 'FORMATTING', { assign: { stage: 'FORMATTING', due: at(-1) } });   // overdue
  await mkArticle('CAT', 'GALLEY_PROOF', { assign: { stage: 'GALLEY_PROOF', due: at(3) }, inIssue: true });
  await mkArticle('MI', 'UNDER_REVIEW', { assign: { stage: 'UNDER_REVIEW', due: at(-2) } });  // overdue
  await mkArticle('MI', 'PLAGIARISM_CHECK', { assign: { stage: 'PLAGIARISM_CHECK', due: at(0) } }); // today
  await mkArticle('MI', 'INITIAL_REVIEW', { assign: { stage: 'INITIAL_REVIEW', due: at(4) } });
  await mkArticle('NEP', 'ACCEPTED', { assign: { stage: 'ACCEPTED', due: at(0) } });          // today
  await mkArticle('ECON', 'FORMATTING', { assign: { stage: 'FORMATTING', due: at(5) } });

  // Pipeline fill (no assignment, just counts across the user's journals)
  await mkArticle('CAT', 'SUBMITTED');
  await mkArticle('CAT', 'INITIAL_REVIEW');
  await mkArticle('MI', 'SUBMITTED');
  await mkArticle('MI', 'QUALITY_CHECK');
  await mkArticle('NEP', 'UNDER_REVIEW');
  await mkArticle('NEP', 'COPYRIGHT_CHECK');
  await mkArticle('ECON', 'REVISION_REQUIRED');
  await mkArticle('CAT', 'GALLEY_PROOF', { inIssue: true });

  // Issue completion: production-ready articles inside issues
  await mkArticle('CAT', 'PUBLISHED', { inIssue: true });
  await mkArticle('NEP', 'GALLEY_PROOF', { inIssue: true });
  await mkArticle('ECON', 'FORMATTING', { inIssue: true });

  // Today's transitions (pipeline "published today" / "rejected")
  await mkArticle('CAT', 'PUBLISHED', { publishedToday: true });
  await mkArticle('MI', 'PUBLISHED', { publishedToday: true });
  await mkArticle('NEP', 'PUBLISHED', { publishedToday: true });
  await mkArticle('ECON', 'REJECTED', { rejectedToday: true });

  console.log(`Done: 4 journals / 4 domains, ${seq} articles, 7 assignments, 4 KRA goals.`);
  console.log(`Log in as ${EMAIL} and open /dashboard/my-publication-workload`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
