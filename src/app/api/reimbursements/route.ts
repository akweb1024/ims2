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
        const { month, year, perks: customPerks } = body;

        if (month == null || year == null) {
            return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
        }

        const m = parseInt(month);
        const y = parseInt(year);

        // Check if already submitted
        const existing = await prisma.reimbursementRecord.findFirst({
            where: { userId: user.id, month: m, year: y }
        });

        if (existing) {
            return NextResponse.json({ error: `Reimbursement for ${m}/${y} already submitted.` }, { status: 400 });
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
            return NextResponse.json({ error: 'Signature is required.' }, { status: 400 });
        }

        // Limits from salary structure
        const limits = {
            healthCare: profile.salaryStructure.healthCare || 0,
            travelling: profile.salaryStructure.travelling || 0,
            mobile: profile.salaryStructure.mobile || 0,
            internet: profile.salaryStructure.internet || 0,
            booksAndPeriodicals: profile.salaryStructure.booksAndPeriodicals || 0,
        };

        // If custom perks provided, validate them. Otherwise use max limits.
        const healthCare = customPerks ? Math.min(customPerks.healthCare || 0, limits.healthCare) : limits.healthCare;
        const travelling = customPerks ? Math.min(customPerks.travelling || 0, limits.travelling) : limits.travelling;
        const mobile = customPerks ? Math.min(customPerks.mobile || 0, limits.mobile) : limits.mobile;
        const internet = customPerks ? Math.min(customPerks.internet || 0, limits.internet) : limits.internet;
        const booksAndPeriodicals = customPerks ? Math.min(customPerks.booksAndPeriodicals || 0, limits.booksAndPeriodicals) : limits.booksAndPeriodicals;

        const totalAmount = healthCare + travelling + mobile + internet + booksAndPeriodicals;

        if (totalAmount <= 0) {
            return NextResponse.json({ error: 'Claim amount must be greater than 0.' }, { status: 400 });
        }

        const record = await prisma.reimbursementRecord.create({
            data: {
                userId: user.id,
                month: m,
                year: y,
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
