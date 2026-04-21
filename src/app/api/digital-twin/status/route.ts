import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import { getEmployeeTwinStatus, getInventoryTwinStatus } from '@/lib/digital-twin/twin-engine';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const companyId = user.companyId;
            if (!companyId) {
                return NextResponse.json({ error: 'User is not associated with a company' }, { status: 400 });
            }

            const [employees, inventory] = await Promise.all([
                getEmployeeTwinStatus(companyId),
                getInventoryTwinStatus(companyId)
            ]);

            return NextResponse.json({
                employees,
                inventory,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);
