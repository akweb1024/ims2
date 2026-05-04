import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { KRA_KPI_TEMPLATES } from '@/lib/performance/kra-kpi-templates';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR', 'HR_MANAGER'],
    async (req: NextRequest) => {
        try {
            const { searchParams } = new URL(req.url);
            const roleType = (searchParams.get('roleType') || '').toUpperCase();
            const family = (searchParams.get('family') || '').toLowerCase();

            const filtered = KRA_KPI_TEMPLATES.filter((template) => {
                const roleOk = roleType ? template.roleType === roleType : true;
                const familyOk = family ? template.family.toLowerCase().includes(family) : true;
                return roleOk && familyOk;
            });

            return NextResponse.json(filtered);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
