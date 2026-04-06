import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !decoded.id) {
            return NextResponse.json({ error: 'Unauthorized: Invalid session.' }, { status: 401 });
        }

        const body = await req.json();
        const { signatureUrl } = body;

        if (!signatureUrl) {
            return NextResponse.json({ error: 'signatureUrl is required' }, { status: 400 });
        }

        try {
            const user = await prisma.user.update({
                where: { id: decoded.id },
                data: { signatureUrl }
            });

            return NextResponse.json({ 
                success: true,
                message: 'Signature updated successfully', 
                signatureUrl: user.signatureUrl 
            });
        } catch (dbError: any) {
            console.error('Signature DB update failed:', dbError.message);
            if (dbError.code === 'P2025') {
                return NextResponse.json({ error: 'User record not found.' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Database update failed.' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Signature Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
