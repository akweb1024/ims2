import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const jobs = await prisma.jobPosting.findMany({
        include: {
            exam: true,
            _count: { select: { applications: true } }
        }
    });

    console.log('--- Job Postings ---');
    jobs.forEach(j => {
        console.log(`Job: ${j.title} (ID: ${j.id})`);
        console.log(`Exam: ${j.exam ? 'CONFIGURED' : 'NONE'}`);
        console.log(`Applications: ${j._count.applications}`);
        console.log('-------------------');
    });

    const exams = await prisma.recruitmentExam.findMany();
    console.log('--- Available Exams ---');
    exams.forEach(e => {
        console.log(`Exam ID: ${e.id} for Job ID: ${e.jobPostingId}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
