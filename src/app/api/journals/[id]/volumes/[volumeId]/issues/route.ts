import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string, volumeId: string }> }) => {
        try {
            const { id } = await context.params;
            const { volumeId } = await context.params;
            const body = await req.json();
            const { issueNumber, month, title, year } = body;
            // note: year technically belongs to volume but some issues might span? No, schema says Issue belongs to Volume.

            const issue = await prisma.journalIssue.create({
                data: {
                    volumeId,
                    issueNumber: parseInt(issueNumber),
                    month,
                    title,
                    status: 'PLANNED'
                }
            });

            return NextResponse.json(issue, { status: 201 });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
