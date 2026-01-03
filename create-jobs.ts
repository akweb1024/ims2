
import { prisma } from '@/lib/prisma';

async function main() {
    console.log('🚀 Creating Job Postings...');

    // 1. Get or Create a Company
    let company = await prisma.company.findFirst();
    if (!company) {
        console.log('⚠️ No company found. Creating default company...');
        company = await prisma.company.create({
            data: {
                name: 'STM Journals',
                email: 'info@stmjournals.com',
                phone: '+91-1234567890'
            }
        });
    }

    const jobs = [
        {
            title: 'AI Engineer',
            description: 'We are looking for an experienced AI Engineer to develop and deploy machine learning models and AI-driven solutions for our platform. Experience with Python, TensorFlow/PyTorch, and NLP is required.',
            requirements: '3+ years experience in AI/ML. Strong Python skills. Knowledge of LLMs and RAG.',
            location: 'Remote / Noida, India',
            salaryRange: '₹12,00,000 - ₹25,00,000 PA',
            type: 'FULL_TIME',
            status: 'OPEN',
            companyId: company.id
        },
        {
            title: 'Wordpress Developer',
            description: 'Seeking a skilled Wordpress Developer to manage and customize our journal websites. Proficiency in PHP, custom theme development, and plugin integration is essential.',
            requirements: '2+ years in Wordpress development. HTML, CSS, PHP, JS.',
            location: 'Noida, India',
            salaryRange: '₹4,00,000 - ₹8,00,000 PA',
            type: 'FULL_TIME',
            status: 'OPEN',
            companyId: company.id
        },
        {
            title: 'Commissioning Editor',
            description: 'Responsible for overseeing the peer review process, managing journal content, and liaising with authors and reviewers. Must have a strong academic background.',
            requirements: 'PhD or Master’s in Science/Tech. Publishing experience preferred.',
            location: 'Noida, India',
            salaryRange: '₹5,00,000 - ₹10,00,000 PA',
            type: 'FULL_TIME',
            status: 'OPEN',
            companyId: company.id
        },
        {
            title: 'Sales Executive',
            description: 'Dynamic Sales Executive needed to drive subscription sales and client acquisition. Must have excellent communication skills and a proven track record in sales.',
            requirements: '1-3 years sales experience. Bachelor’s degree. CRM familiarity.',
            location: 'Field / Noida, India',
            salaryRange: '₹3,00,000 - ₹6,00,000 PA + Incentives',
            type: 'FULL_TIME',
            status: 'OPEN',
            companyId: company.id
        }
    ];

    for (const job of jobs) {
        await prisma.jobPosting.create({
            data: job
        });
        console.log(`✅ Created Job: ${job.title}`);
    }

    console.log('🎉 All jobs created successfully!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
