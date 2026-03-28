const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const res = await prisma.lMSParticipant.create({
      data: {
        pid: "test-pid",
        name: "test-name",
        email: "test-email"
      }
    });
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
