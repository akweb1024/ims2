import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const profileData = {
  customerType: "ORGANIZATION",
  organizationType: "AGENCY",
  governanceType: "PRIVATE",
  universityCategory: "STATE",
  affiliatedUniversityId: null,
  associatedAgencyId: null,
  discountOffered: 10,
  region: null
};

async function run() {
  try {
    await prisma.customerProfile.update({
      where: { id: "a065ca77-132a-4bef-ade5-250c4fd11044" },
      data: {
        ...profileData,
        billingCountry: 'India',
        shippingCountry: 'India'
      }
    });
    console.log("SUCCESS");
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
