import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const body = await req.json();
        const { signatureUrl } = body;

        if (!signatureUrl) {
            return NextResponse.json({ error: 'signatureUrl is required' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id: decoded.id },
            data: { signatureUrl }
        });

        return NextResponse.json({ message: 'Signature updated successfully', signatureUrl: user.signatureUrl });

    } catch (error: any) {
        console.error('Signature Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
