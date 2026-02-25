import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

// GET: Fetch company billing/invoice details
export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const companyId = (decoded as any).companyId;
        if (!companyId) return NextResponse.json({ error: 'No company associated' }, { status: 400 });

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true, name: true, legalEntityName: true, tagline: true,
                address: true, email: true, phone: true, website: true, logoUrl: true,
                gstin: true, stateCode: true, cinNo: true, panNo: true, iecCode: true,
                bankName: true, bankAccountHolder: true, bankAccountNumber: true,
                bankIfscCode: true, bankSwiftCode: true, paymentMode: true,
                currency: true
            }
        });

        return NextResponse.json(company || {});
    } catch (error: any) {
        console.error('Company Billing GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH: Update company billing/invoice details
export async function PATCH(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'FINANCE_ADMIN'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden - Requires SUPER_ADMIN or FINANCE_ADMIN' }, { status: 403 });
        }

        const companyId = (decoded as any).companyId;
        if (!companyId) return NextResponse.json({ error: 'No company associated' }, { status: 400 });

        const body = await req.json();

        // Whitelist of updatable fields
        const allowed = [
            'name', 'legalEntityName', 'tagline', 'address', 'email', 'phone', 'website', 'logoUrl',
            'gstin', 'stateCode', 'cinNo', 'panNo', 'iecCode',
            'bankName', 'bankAccountHolder', 'bankAccountNumber',
            'bankIfscCode', 'bankSwiftCode', 'paymentMode', 'currency'
        ];

        const data: any = {};
        for (const key of allowed) {
            if (key in body) data[key] = body[key];
        }

        const updated = await prisma.company.update({
            where: { id: companyId },
            data,
            select: {
                id: true, name: true, legalEntityName: true, tagline: true,
                address: true, email: true, phone: true, website: true, logoUrl: true,
                gstin: true, stateCode: true, cinNo: true, panNo: true, iecCode: true,
                bankName: true, bankAccountHolder: true, bankAccountNumber: true,
                bankIfscCode: true, bankSwiftCode: true, paymentMode: true, currency: true
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('Company Billing PATCH Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
