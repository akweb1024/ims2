require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' }
  });

  if (!admin) {
    console.log('No admin user found to author guidelines.');
    return;
  }

  const guidelines = [
    {
      title: 'How to Settle Invoices',
      content: 'To settle an invoice, navigate to the Invoice Detail page, click the "Settle" button, and follow the payment prompts. Ensure the correct currency is selected.',
      category: 'BILLING',
      targetRole: 'ALL'
    },
    {
      title: 'Tax Calculation Guidelines',
      content: 'Domestic invoices are subject to 18% GST. International invoices are non-taxable (0%). Always verify the customer region before finalizing prices.',
      category: 'BILLING',
      targetRole: 'ALL'
    },
    {
      title: 'Subscription Creation Process',
      content: 'When creating a subscription, step 1 is selecting the customer. Step 2 requires adding journals/plans. Invoices are auto-generated upon submission.',
      category: 'SUBSCRIPTION',
      targetRole: 'ALL'
    },
    {
      title: 'IT Support Protocol',
      content: 'For any technical issues, create a support ticket with priority level. Urgent tickets are addressed within 2 hours.',
      category: 'IT',
      targetRole: 'ALL'
    }
  ];

  for (const g of guidelines) {
    await prisma.knowledgeArticle.upsert({
      where: { id: `seed-${g.title.replace(/\s+/g, '-').toLowerCase()}` },
      update: { ...g, authorId: admin.id },
      create: { 
        id: `seed-${g.title.replace(/\s+/g, '-').toLowerCase()}`,
        ...g, 
        authorId: admin.id 
      }
    });
  }

  console.log('Guidelines seeded successfully!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
