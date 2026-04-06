import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

// User fetches their own reimbursements
export const GET = authorizedRoute([], async (req: NextRequest, user: any) => {
    try {
        const records = await prisma.reimbursementRecord.findMany({
            where: { userId: user.id },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });
        
        return NextResponse.json({ data: records });
    } catch (error: any) {
        console.error('Reimbursement GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});

export const POST = authorizedRoute([], async (req: NextRequest, user: any) => {
    try {
        const body = await req.json();
        const { month, year } = body;

        if (month == null || year == null) {
            return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
        }

        // Check if already submitted
        const existing = await prisma.reimbursementRecord.findFirst({
            where: { userId: user.id, month: parseInt(month), year: parseInt(year) }
        });

        if (existing) {
            return NextResponse.json({ error: `Reimbursement for ${month}/${year} already submitted.` }, { status: 400 });
        }

        // Get Employee profile context 
        const profile = await prisma.employeeProfile.findUnique({
            where: { userId: user.id },
            include: { salaryStructure: true }
        });

        if (!profile || !profile.salaryStructure) {
            return NextResponse.json({ error: 'Employee salary structure not found' }, { status: 404 });
        }

        // Fetch signature from user
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { signatureUrl: true }
        });

        if (!dbUser?.signatureUrl) {
            return NextResponse.json({ error: 'Signature is required. Please upload it in your profile settings.' }, { status: 400 });
        }

        // Exact match with schema and backend calculation mapping
        const healthCare = profile.salaryStructure.healthCare || 0;
        const travelling = profile.salaryStructure.travelling || 0;
        const mobile = profile.salaryStructure.mobile || 0;
        const internet = profile.salaryStructure.internet || 0;
        const booksAndPeriodicals = profile.salaryStructure.booksAndPeriodicals || 0;

        const totalAmount = healthCare + travelling + mobile + internet + booksAndPeriodicals;

        // Ensure they have perks
        if (totalAmount <= 0) {
            return NextResponse.json({ error: 'You do not have any reimbursable perks assigned in your profile.' }, { status: 400 });
        }

        const record = await prisma.reimbursementRecord.create({
            data: {
                userId: user.id,
                month: parseInt(month),
                year: parseInt(year),
                healthCare,
                travelling,
                mobile,
                internet,
                booksAndPeriodicals,
                totalAmount,
                status: 'SUBMITTED',
                employeeSignatureUrl: dbUser.signatureUrl
            }
        });

        return NextResponse.json({ data: record });

    } catch (error: any) {
        console.error('Reimbursement POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});
