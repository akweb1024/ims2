import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data } = await req.json();

        if (!Array.isArray(data)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        let createdCount = 0;
        let skippedCount = 0;

        for (const rawItem of data) {
            // Normalizing keys
            const item: any = {};
            Object.keys(rawItem).forEach(key => {
                item[key.toLowerCase().replace(/\s/g, '')] = rawItem[key];
            });

            const email = item.email;
            if (!email) {
                skippedCount++;
                continue;
            }

            const existing = await prisma.user.findUnique({
                where: { email: email }
            });

            if (existing) {
                skippedCount++;
                continue;
            }

            const hashedPassword = await bcrypt.hash(item.password || 'password123', 12);

            let targetCompanyId = item.companyid || decoded.companyId;

            // Security: Managers can only import into their own company
            if (decoded.role === 'MANAGER') {
                targetCompanyId = decoded.companyId;
            }

            await prisma.user.create({
                data: {
                    email: email,
                    password: hashedPassword,
                    role: item.role || 'EXECUTIVE',
                    companyId: targetCompanyId,
                    isActive: true,
                    emailVerified: true
                }
            });
            createdCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Successfully imported ${createdCount} users. ${skippedCount} items skipped (already exist).`
        });

    } catch (error: any) {
        console.error('Import Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message
        }, { status: 500 });
    }
}
