import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { getEmployeeTwinStatus, getInventoryTwinStatus, computeTwinSummary } from '@/lib/digital-twin/twin-engine';
import { resolveCompanyScope } from '@/lib/access-policy';
import { triggerSentinelAudit } from '@/lib/sentinel/agents/sentinel-manager';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        const startTime = Date.now();
        try {
            const companyId = await resolveCompanyScope(req, user);
            if (!companyId) {
                return NextResponse.json({ error: 'Select a specific company for Digital Twin status' }, { status: 400 });
            }

            const [employees, inventory] = await Promise.all([
                getEmployeeTwinStatus(companyId),
                getInventoryTwinStatus(companyId)
            ]);

            const summary = computeTwinSummary(employees, inventory);
            const duration = Date.now() - startTime;

            // Trigger proactive audit in background
            triggerSentinelAudit(companyId).catch(e => console.error('[Sentinel] Audit failed', e));

            logger.apiRequest('GET', req.nextUrl.pathname, 200, duration, { 
                employeeCount: employees.length,
                inventoryCount: inventory.length
            });

            return NextResponse.json({
                employees,
                inventory,
                summary,
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
