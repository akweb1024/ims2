import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { reportId, content } = await req.json();

            if (!reportId || !content) {
                return createErrorResponse('Report ID and content are required', 400);
            }

            const report = await prisma.workReport.findUnique({
                where: { id: reportId },
                include: { employee: true }
            });

            if (!report) return createErrorResponse('Report not found', 404);

            // Access Control: Owner OR hierarchically superior
            const isOwner = report.employee.userId === user.id;
            let isAuthorized = isOwner;

            if (!isAuthorized) {
                if (['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
                    isAuthorized = true;
                } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    const subIds = await getDownlineUserIds(user.id, null);
                    if (subIds.includes(report.employee.userId)) {
                        isAuthorized = true;
                    }
                }
            }

            if (!isAuthorized) return createErrorResponse('Forbidden', 403);

            const comment = await prisma.workReportComment.create({
                data: {
                    workReportId: reportId,
                    authorId: user.id,
                    content
                },
                include: {
                    author: {
                        select: { email: true }
                    }
                }
            });

            return NextResponse.json(comment);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
