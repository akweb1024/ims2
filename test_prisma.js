const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.employeeTaskTemplate.findMany({
    where: {
      designationIds: {
        array_contains: ["some-uuid"]
      }
    }
  })
  console.log(result.length)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
