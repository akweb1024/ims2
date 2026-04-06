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
            // Use raw query to bypass potential Prisma client adapter field recognition issues
            await prisma.$executeRawUnsafe(
                `UPDATE "User" SET "signatureUrl" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
                signatureUrl,
                decoded.id
            );

            return NextResponse.json({ 
                success: true,
                message: 'Signature updated successfully', 
                signatureUrl 
            });
        } catch (dbError: any) {
            console.error('Signature DB update failed:', JSON.stringify({
                message: dbError.message,
                code: dbError.code,
                meta: dbError.meta,
                stack: dbError.stack?.split('\n').slice(0, 5)
            }));
            return NextResponse.json({ error: 'Database update failed.', details: dbError.message }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Signature Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
