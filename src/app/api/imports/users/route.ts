import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const IMPORTABLE_ROLES = new Set<UserRole>([
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.TEAM_LEADER,
    UserRole.HR,
    UserRole.HR_MANAGER,
    UserRole.FINANCE_ADMIN,
    UserRole.EXECUTIVE,
    UserRole.CUSTOMER,
    UserRole.AGENCY,
    UserRole.JOURNAL_MANAGER,
    UserRole.PLAGIARISM_CHECKER,
    UserRole.QUALITY_CHECKER,
    UserRole.EDITOR_IN_CHIEF,
    UserRole.SECTION_EDITOR,
    UserRole.REVIEWER,
    UserRole.IT_MANAGER,
    UserRole.IT_ADMIN,
]);

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

            const requestedRole = String(item.role || UserRole.EXECUTIVE).toUpperCase() as UserRole;
            const role =
                decoded.role === 'SUPER_ADMIN' && IMPORTABLE_ROLES.has(requestedRole)
                    ? requestedRole
                    : UserRole.EXECUTIVE;

            await prisma.user.create({
                data: {
                    email: email,
                    password: hashedPassword,
                    role,
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
