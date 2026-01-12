import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { id } = params;

            const conference = await prisma.conference.findUnique({
                where: { id },
                include: {
                    ticketTypes: true
                }
            });

            if (!conference) {
                return createErrorResponse('Conference not found', 404);
            }

            // Validation before publishing
            const errors: string[] = [];

            if (!conference.title || conference.title.trim() === '') {
                errors.push('Title is required');
            }

            if (!conference.description || conference.description.trim() === '') {
                errors.push('Description is required');
            }

            if (!conference.startDate) {
                errors.push('Start date is required');
            }

            if (!conference.endDate) {
                errors.push('End date is required');
            }

            if (conference.startDate && conference.endDate && conference.endDate <= conference.startDate) {
                errors.push('End date must be after start date');
            }

            if (conference.ticketTypes.length === 0) {
                errors.push('At least one ticket type is required');
            }

            if (errors.length > 0) {
                console.log('Publish validation failed for:', id, errors);
                return NextResponse.json({
                    success: false,
                    errors
                }, { status: 400 });
            }

            console.log('Publishing conference:', id);
            // Publish the conference
            const updated = await prisma.conference.update({
                where: { id },
                data: {
                    status: 'PUBLISHED',
                    isActive: true
                }
            });

            return NextResponse.json({
                success: true,
                conference: updated,
                message: 'Conference published successfully'
            });
        } catch (error) {
            console.error('API Publish Error:', error);
            return createErrorResponse(error);
        }
    }
);
