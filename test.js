const { prisma } = require('./src/lib/prisma.ts');

async function test() {
  try {
    const res = await prisma.lMSParticipant.create({
      data: {
        pid: "test-pid-xyz",
        name: "Test User",
        email: "test@example.com",
      }
    });
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
