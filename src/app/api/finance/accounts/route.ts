import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Use user.companyId if available, else 400
        const companyId = user.companyId;
        if (!companyId) return NextResponse.json({ error: 'No associated company' }, { status: 400 });

        const company = { id: companyId }; // Mock object to keep structure strict


        const accounts = await prisma.account.findMany({
            where: { companyId: company.id },
            include: { parentAccount: true },
            orderBy: { code: 'asc' }
        });

        return NextResponse.json(accounts);
    } catch (error) {
        console.error('Error fetching accounts:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();
        const company = await prisma.company.findFirst(); // Replace with actual auth
        if (!company) return NextResponse.json({ error: 'No company found' }, { status: 404 });

        const account = await prisma.account.create({
            data: {
                companyId: company.id,
                code: data.code,
                name: data.name,
                type: data.type,
                description: data.description,
                parentAccountId: data.parentAccountId || null,
            }
        });

        return NextResponse.json(account);
    } catch (error) {
        console.error('Error creating account:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
