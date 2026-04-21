import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { getEmployeeTwinStatus, getInventoryTwinStatus } from '@/lib/digital-twin/twin-engine';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        const startTime = Date.now();
        try {
            const companyId = user.companyId;
            if (!companyId) {
                logger.warn('Digital Twin access attempt without companyId', { userId: user.id });
                return NextResponse.json({ error: 'User is not associated with a company' }, { status: 400 });
            }

            const [employees, inventory] = await Promise.all([
                getEmployeeTwinStatus(companyId),
                getInventoryTwinStatus(companyId)
            ]);

            const duration = Date.now() - startTime;
            logger.apiRequest('GET', req.nextUrl.pathname, 200, duration, { 
                employeeCount: employees.length,
                inventoryCount: inventory.length
            });

            return NextResponse.json({
                employees,
                inventory,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Digital Twin API Request Failed', error, { 
                path: req.nextUrl.pathname,
                userId: user.id 
            });
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);
