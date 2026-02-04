import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching payments...');
    try {
        const payments = await prisma.payment.findMany({
            where: { razorpayPaymentId: { not: null } },
            take: 10,
            orderBy: { paymentDate: 'desc' }
        });

        console.log('Recent Razorpay Payments:');
        payments.forEach(p => {
            console.log({
                id: p.id,
                razorpayPaymentId: p.razorpayPaymentId,
                amount: p.amount,
                currency: p.currency,
                status: p.status,
                paymentDate: p.paymentDate
            });
        });
    } catch (e) {
        console.error('Query Failed:', e);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
