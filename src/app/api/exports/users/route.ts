import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            include: {
                company: true,
                department: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        // Generate CSV
        const headers = ['ID', 'Email', 'Role', 'Status', 'Company', 'Department', 'Email Verified', 'Created At'];
        const rows = users.map(user => [
            user.id,
            user.email,
            user.role,
            user.isActive ? 'Active' : 'Inactive',
            user.company?.name || 'N/A',
            user.department?.name || 'N/A',
            user.emailVerified ? 'Yes' : 'No',
            user.createdAt.toISOString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="users-export-${Date.now()}.csv"`
            }
        });

    } catch (error: any) {
        console.error('Export Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
