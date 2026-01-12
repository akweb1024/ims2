import { prisma } from './src/lib/prisma';

async function test() {
  try {
    const courseId = '22dbbc56-cba2-43f2-83df-45d240a004a1';
    const title = 'Test Module';
    const description = 'Test Description';
    
    // Check if course exists
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    console.log('Course found:', !!course);
    
    if (course) {
        const lastModule = await prisma.courseModule.findFirst({
            where: { courseId },
            orderBy: { order: 'desc' }
        });
        const newOrder = (lastModule?.order || 0) + 1;
        
        const module = await prisma.courseModule.create({
            data: {
                courseId,
                title,
                description,
                order: newOrder
            }
        });
        console.log('Module created:', module.id);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
