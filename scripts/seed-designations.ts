import { prisma } from '../src/lib/prisma';

const designations = [
  'Chancellor','Vice Chancellor','Pro Vice Chancellor','Rector','Registrar',
  'Director','Principal','Dean','Associate Dean','Head of Department (HOD)',
  'Deputy Director','Joint Director','Academic Director','Controller of Examinations',
  'Finance Officer','Professor','Associate Professor','Assistant Professor',
  'Lecturer','Senior Lecturer','Reader','Adjunct Professor','Visiting Professor',
  'Emeritus Professor','Research Professor','Research Scientist','Research Fellow',
  'Post-Doctoral Fellow','Research Associate','Research Assistant',
  'Doctoral Researcher / PhD Scholar','Teaching Assistant','Faculty','Instructor',
  'Academic Coordinator','Program Director','Course Coordinator','Admissions Officer',
  'Placement Officer','Administrative Officer','Teaching Staff','Non-Teaching Staff',
  'Student','Librarian','Chief Librarian','University Librarian','Deputy Librarian',
  'Assistant Librarian','Library Officer','Library Assistant','Information Scientist',
  'Knowledge Manager','Digital Resources Manager','Cataloguer','Archivist',
  'Chief Executive Officer (CEO)','Chief Operating Officer (COO)',
  'Chief Financial Officer (CFO)','Chief Technology Officer (CTO)',
  'Chief Information Officer (CIO)','Managing Director (MD)','Executive Director',
  'General Manager','Deputy General Manager','Vice President','Senior Vice President',
  'Senior Manager','Manager','Assistant Manager','Purchase Manager','Procurement Head',
  'Sales Manager','Business Development Manager','Marketing Manager','Product Manager',
  'Project Manager','Operations Manager','HR Manager','Finance Manager',
  'Accounts Manager','IT Manager','Software Engineer','Senior Software Engineer',
  'Data Scientist','Data Analyst','Business Analyst','System Administrator',
  'Consultant','Senior Consultant','Analyst','Executive','Team Leader',
  'Proprietor / Owner','Partner','Entrepreneur',
  'IAS Officer','IPS Officer','Gazetted Officer','Section Officer','Secretary',
  'Commissioner','District Collector',
  'Doctor / Physician','Medical Officer','Surgeon','Pharmacist','Nurse',
  'Hospital Administrator','Medical Superintendent',
  'Independent Researcher','Freelancer','Author / Writer','Editor','Publisher','Other',
];

async function main() {
  let done = 0;
  for (const name of designations) {
    await prisma.globalDesignation.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true, level: 1, expectedExperience: 0 },
    });
    done++;
  }
  console.log('Seeded', done, 'CRM designations');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
