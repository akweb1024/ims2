import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const company = await prisma.company.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        departments: true
                    }
                }
            }
        });

        if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

        // Security check: Only SUPER_ADMIN or users of that company
        if (decoded.role !== 'SUPER_ADMIN' && decoded.companyId !== id) {
            // Check if they are ADMIN/MANAGER of this company specifically
            // This is a bit complex, let's simplify for now: SUPER_ADMIN or if it's their company
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(company);
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'ADMIN'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { name, domain, email, phone, address, website, currency, timezone, fiscalYearStart } = body;

        const company = await prisma.company.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(domain !== undefined && { domain }),
                ...(email !== undefined && { email }),
                ...(phone !== undefined && { phone }),
                ...(address !== undefined && { address }),
                ...(website !== undefined && { website }),
                ...(currency && { currency }),
                ...(timezone && { timezone }),
                ...(fiscalYearStart !== undefined && { fiscalYearStart })
            },
            include: {
                _count: {
                    select: {
                        users: true,
                        departments: true
                    }
                }
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'update',
                entity: 'company',
                entityId: id,
                changes: JSON.stringify(body)
            }
        });

        return NextResponse.json(company);
    } catch (error) {
        console.error('Update Company Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
