import * as dotenv from 'dotenv';
dotenv.config();

const { prisma } = require('../src/lib/prisma');

async function main() {
    const journalAbbr = 'IJWHNP';
    let journal = await prisma.journal.findUnique({
        where: { abbreviation: journalAbbr }
    });

    if (!journal) {
        console.log(`Journal ${journalAbbr} not found. Creating it...`);
        journal = await prisma.journal.create({
            data: {
                name: "International Journal of Women's Health Nursing And Practices",
                abbreviation: journalAbbr,
                frequency: "Semi-Annual",
                isActive: true
            }
        });
    }

    console.log(`Found journal: ${journal.name} (ID: ${journal.id})`);

    const years = [2024, 2025, 2026];
    
    // Plans:
    // FORMAT / ISSUE / PRICE / DURATION
    const planTemplates = [
        { format: 'PRINT', issue: 'ISSUE_1', priceINR: 1975, duration: 183 },
        { format: 'PRINT', issue: 'ISSUE_2', priceINR: 1975, duration: 183 },
        { format: 'PRINT', issue: 'ALL', priceINR: 3500, duration: 365 },
        { format: 'ONLINE', issue: 'ALL', priceINR: 6500, duration: 365 },
        { format: 'PRINT_ONLINE', issue: 'ALL', priceINR: 7315, duration: 365 },
    ];

    for (const year of years) {
        for (const template of planTemplates) {
            const plan = await prisma.plan.create({
                data: {
                    journalId: journal.id,
                    planType: 'SUBSCRIPTION',
                    format: template.format,
                    issue: template.issue,
                    subscriptionYear: year,
                    priceINR: template.priceINR,
                    duration: template.duration,
                    isActive: true
                }
            });
            console.log(`Created plan: ${year} - ${template.format} - ${template.issue} (ID: ${plan.id})`);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
