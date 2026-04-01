import { prisma } from './src/lib/prisma';
async function main() {
  const latest = await prisma.lMSParticipant.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  console.log(JSON.stringify(latest, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
