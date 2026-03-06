import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import { NextResponse } from 'next/server';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req, user, { params }) => {
        try {
            const { id } = await params;

            // Find the lead
            const lead = await prisma.customerProfile.findFirst({
                where: { id, companyId: user.companyId }
            });

            if (!lead) {
                return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
            }

            // Convert lead: set status to null (signifying full customer)
            const updatedCustomer = await prisma.customerProfile.update({
                where: { id },
                data: {
                    leadStatus: null, 
                    updatedAt: new Date()
                }
            });

            // Log the conversion
            await prisma.communicationLog.create({
                data: {
                    customerProfileId: id,
                    userId: user.id || '',
                    companyId: user.companyId || '',
                    channel: 'System',
                    type: 'COMMENT',
                    subject: 'Lead Converted to Customer',
                    notes: `Lead was manually converted to a formal customer by ${user.email}.`,
                    date: new Date()
                }
            });

            // Audit Log
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'CONVERT_LEAD',
                    entity: 'CustomerProfile',
                    entityId: id,
                    changes: { leadStatus: { from: lead.leadStatus, to: null } }
                }
            });

            return NextResponse.json({
                message: 'Lead converted successfully',
                customer: updatedCustomer
            });

        } catch (error) {
            return handleApiError(error, 'Failed to convert lead');
        }
    }
);
