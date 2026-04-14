import { prisma } from '../../src/lib/prisma';

async function main() {
    await prisma.customerProfile.updateMany({
        where: { customerType: 'AGENCY' },
        data: { customerType: 'ORGANIZATION', organizationType: 'AGENCY' }
    });
    
    await prisma.customerProfile.updateMany({
        where: { customerType: 'INSTITUTION' },
        data: { customerType: 'ORGANIZATION', organizationType: 'INSTITUTION' }
    });
    
    await prisma.customerProfile.updateMany({
        where: { customerType: 'UNIVERSITY' },
        data: { customerType: 'ORGANIZATION', organizationType: 'UNIVERSITY' }
    });
    
    console.log("CustomerType updated safely.");
}

main().catch(console.error);
