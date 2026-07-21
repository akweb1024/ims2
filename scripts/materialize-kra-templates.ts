/**
 * Materialize the static role KRA/KPI catalog into the KRA admin console
 * (PerformanceMetricDefinition + KraTemplate matrices) for every company.
 *
 * Run:  DATABASE_URL=... npm run kra:materialize
 * After this, HR assigns these role templates from the console's
 * Templates → Assign flow like any other template.
 */
import { prisma } from '../src/lib/prisma';
import { materializeCatalogTemplates } from '../src/lib/kra/materialize-templates';

async function main() {
    const companies = await prisma.company.findMany({ select: { id: true, name: true } });
    if (companies.length === 0) throw new Error('No companies found.');

    for (const company of companies) {
        const r = await materializeCatalogTemplates(prisma, company.id);
        console.log(
            `${company.name}: metrics +${r.metricsCreated}/~${r.metricsUpdated}, ` +
            `templates +${r.templatesCreated}/~${r.templatesUpdated}, ${r.items} matrix items`,
        );
    }
    console.log('\nDone. Role templates now live in the KRA console (Templates tab).');
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
