/**
 * KRA system seed (Phase 0) — NON-destructive, idempotent.
 *
 * Seeds the KRA metric catalog (into PerformanceMetricDefinition, scope="KRA")
 * and one starter KraTemplate per department, for every company.
 *
 * Safe to run repeatedly: everything upserts. It never deletes business data.
 *
 *   npx tsx prisma/seed-kra.ts
 */
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

type Catalog = {
  department: string;        // tag, matched loosely against Department.name
  key: string;
  name: string;
  unit: string;
  direction: 'HIGHER_BETTER' | 'LOWER_BETTER';
  dataSource: 'SYSTEM' | 'MANUAL' | 'HYBRID';
  sourceType?: string;       // for auto-verify; omit for pure MANUAL
  aggregation: 'SUM' | 'COUNT' | 'AVG';
  defaultTarget: number;     // starter monthly target in the template
  weight: number;            // contribution weight in the index
};

// Canonical metric catalog per department. Targets/weights are sensible
// starters — managers tweak per employee after assignment.
const CATALOG: Catalog[] = [
  // ---- Publication ----
  { department: 'Publication', key: 'articles_published', name: 'Articles Published', unit: 'articles', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'SUM', defaultTarget: 20, weight: 2 },
  { department: 'Publication', key: 'journal_issues_completed', name: 'Journal Issues Completed', unit: 'issues', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'SUM', defaultTarget: 2, weight: 2 },
  { department: 'Publication', key: 'articles_processed', name: 'Articles Processed', unit: 'articles', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'SUM', defaultTarget: 40, weight: 1 },
  { department: 'Publication', key: 'apc_revenue', name: 'APC Revenue', unit: '₹', direction: 'HIGHER_BETTER', dataSource: 'HYBRID', sourceType: 'REVENUE_TRANSACTION', aggregation: 'SUM', defaultTarget: 100000, weight: 2 },

  // ---- Formatting / Quality ----
  { department: 'Formatting', key: 'articles_qc_done', name: 'Articles QC Done', unit: 'articles', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'SUM', defaultTarget: 60, weight: 2 },
  { department: 'Formatting', key: 'qc_pass_rate', name: 'QC Pass Rate', unit: '%', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'AVG', defaultTarget: 95, weight: 1 },
  { department: 'Formatting', key: 'articles_formatted', name: 'Articles Formatted', unit: 'articles', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'SUM', defaultTarget: 60, weight: 2 },

  // ---- Marketing ----
  { department: 'Marketing', key: 'subscriptions_sold', name: 'Subscriptions Sold', unit: 'subscriptions', direction: 'HIGHER_BETTER', dataSource: 'HYBRID', sourceType: 'SUBSCRIPTION', aggregation: 'SUM', defaultTarget: 30, weight: 2 },
  { department: 'Marketing', key: 'products_sold', name: 'Products Sold', unit: 'units', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'SUM', defaultTarget: 25, weight: 1 },
  { department: 'Marketing', key: 'marketing_revenue', name: 'Marketing Revenue', unit: '₹', direction: 'HIGHER_BETTER', dataSource: 'HYBRID', sourceType: 'REVENUE_TRANSACTION', aggregation: 'SUM', defaultTarget: 200000, weight: 3 },
  { department: 'Marketing', key: 'leads_converted', name: 'Leads Converted', unit: 'leads', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'SUM', defaultTarget: 15, weight: 1 },

  // ---- Training ----
  { department: 'Training', key: 'courses_created', name: 'Courses Created', unit: 'courses', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'SUM', defaultTarget: 2, weight: 2 },
  { department: 'Training', key: 'workshops_conducted', name: 'Workshops Conducted', unit: 'workshops', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'SUM', defaultTarget: 4, weight: 2 },
  { department: 'Training', key: 'course_enrollments', name: 'Course Enrollments', unit: 'enrollments', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'SUM', defaultTarget: 50, weight: 1 },
  { department: 'Training', key: 'training_revenue', name: 'Training Revenue', unit: '₹', direction: 'HIGHER_BETTER', dataSource: 'HYBRID', sourceType: 'REVENUE_TRANSACTION', aggregation: 'SUM', defaultTarget: 150000, weight: 3 },

  // ---- IT ----
  { department: 'IT', key: 'tickets_resolved', name: 'Tickets Resolved', unit: 'tickets', direction: 'HIGHER_BETTER', dataSource: 'HYBRID', sourceType: 'SUPPORT_TICKET', aggregation: 'SUM', defaultTarget: 80, weight: 2 },
  { department: 'IT', key: 'projects_delivered', name: 'Projects Delivered', unit: 'projects', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'SUM', defaultTarget: 3, weight: 2 },
  { department: 'IT', key: 'support_requests_closed', name: 'Support Requests Closed', unit: 'requests', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'SUM', defaultTarget: 100, weight: 1 },
  { department: 'IT', key: 'uptime_pct', name: 'System Uptime', unit: '%', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'AVG', defaultTarget: 99, weight: 1 },

  // ---- Accounts ----
  { department: 'Accounts', key: 'invoices_processed', name: 'Invoices Processed', unit: 'invoices', direction: 'HIGHER_BETTER', dataSource: 'HYBRID', sourceType: 'INVOICE', aggregation: 'SUM', defaultTarget: 120, weight: 2 },
  { department: 'Accounts', key: 'reconciliations_done', name: 'Reconciliations Done', unit: 'count', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'SUM', defaultTarget: 20, weight: 1 },
  { department: 'Accounts', key: 'collections_amount', name: 'Collections Amount', unit: '₹', direction: 'HIGHER_BETTER', dataSource: 'HYBRID', sourceType: 'REVENUE_TRANSACTION', aggregation: 'SUM', defaultTarget: 300000, weight: 3 },

  // ---- Dispatch / Logistics ----
  { department: 'Dispatch', key: 'shipments_dispatched', name: 'Shipments Dispatched', unit: 'shipments', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'SUM', defaultTarget: 100, weight: 2 },
  { department: 'Dispatch', key: 'on_time_delivery_rate', name: 'On-Time Delivery Rate', unit: '%', direction: 'HIGHER_BETTER', dataSource: 'MANUAL', aggregation: 'AVG', defaultTarget: 95, weight: 1 },
];

// Loose match between a catalog department tag and a real Department.name.
function deptMatches(tag: string, deptName: string): boolean {
  const a = tag.toLowerCase();
  const b = deptName.toLowerCase();
  return b.includes(a) || a.includes(b);
}

async function main() {
  console.log('🌱 Seeding KRA metric catalog + starter templates (non-destructive)...');

  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  if (companies.length === 0) {
    console.log('No companies found — nothing to seed.');
    return;
  }

  let metricCount = 0;
  let templateCount = 0;
  let itemCount = 0;

  for (const company of companies) {
    // 1) Upsert metric catalog for this company.
    const metricIdByKey = new Map<string, string>();
    for (const m of CATALOG) {
      const metric = await prisma.performanceMetricDefinition.upsert({
        where: { companyId_scope_key: { companyId: company.id, scope: 'KRA', key: m.key } },
        update: {
          name: m.name, unit: m.unit, direction: m.direction,
          dataSource: m.dataSource, sourceType: m.sourceType ?? null,
          aggregation: m.aggregation, department: m.department, isActive: true,
        },
        create: {
          companyId: company.id, scope: 'KRA', key: m.key, name: m.name,
          unit: m.unit, direction: m.direction, sourceModule: 'KRA',
          dataSource: m.dataSource, sourceType: m.sourceType ?? null,
          aggregation: m.aggregation, department: m.department, isActive: true,
        },
      });
      metricIdByKey.set(m.key, metric.id);
      metricCount++;
    }

    // 2) One starter template per department tag present in the catalog.
    const departments = await prisma.department.findMany({
      where: { companyId: company.id },
      select: { id: true, name: true },
    });
    const tags = Array.from(new Set(CATALOG.map((c) => c.department)));

    for (const tag of tags) {
      const matchedDept = departments.find((d) => deptMatches(tag, d.name));
      const templateName = `${tag} KRA`;

      let template = await prisma.kraTemplate.findFirst({
        where: { companyId: company.id, name: templateName },
      });
      if (!template) {
        template = await prisma.kraTemplate.create({
          data: {
            companyId: company.id,
            name: templateName,
            description: `Starter KRA template for ${tag}`,
            departmentId: matchedDept?.id ?? null,
          },
        });
        templateCount++;
      } else if (matchedDept && template.departmentId !== matchedDept.id) {
        template = await prisma.kraTemplate.update({
          where: { id: template.id },
          data: { departmentId: matchedDept.id },
        });
      }

      // 3) Template items for each metric of this department.
      const items = CATALOG.filter((c) => c.department === tag);
      for (const it of items) {
        const metricId = metricIdByKey.get(it.key)!;
        await prisma.kraTemplateItem.upsert({
          where: { templateId_metricId_periodType: { templateId: template.id, metricId, periodType: 'MONTHLY' } },
          update: { defaultTarget: it.defaultTarget, weight: it.weight },
          create: {
            templateId: template.id, metricId,
            defaultTarget: it.defaultTarget, weight: it.weight, periodType: 'MONTHLY',
          },
        });
        itemCount++;
      }
    }

    console.log(`  ✓ ${company.name}: metrics + ${tags.length} templates`);
  }

  console.log(`✅ Done. Upserted ${metricCount} metrics, ${templateCount} new templates, ${itemCount} template items across ${companies.length} companies.`);
}

main()
  .catch((e) => {
    console.error('KRA seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
