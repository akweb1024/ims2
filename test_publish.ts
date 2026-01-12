import { prisma } from './src/lib/prisma';

async function test() {
  try {
    const conf = await prisma.conference.findFirst();
    if (conf) {
        console.log('Testing conference publish for:', conf.id);
        const updated = await prisma.conference.update({
            where: { id: conf.id },
            data: { status: 'PUBLISHED' }
        });
        console.log('Conference status after manual update:', updated.status);
    }
    
    const course = await prisma.course.findFirst();
    if (course) {
        console.log('Testing course publish for:', course.id);
        const updated = await prisma.course.update({
            where: { id: course.id },
            data: { isPublished: true }
        });
        console.log('Course isPublished after manual update:', updated.isPublished);
    }
  } catch (e) {
    console.error('Error during update:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
