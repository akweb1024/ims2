
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Find the lead
        const lead = await prisma.customerProfile.findFirst({
            where: { id, companyId: user.companyId }
        });

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        // Convert lead: set status to null (signifying full customer) or specific CONVERTED tag
        // Depending on app logic, leadStatus = null means they are a regular customer.
        const updatedCustomer = await prisma.customerProfile.update({
            where: { id },
            data: {
                leadStatus: 'CONVERTED', // We keep CONVERTED but they will now show in customer lists too
                updatedAt: new Date()
            }
        });

        // Log the conversion
        await prisma.communicationLog.create({
            data: {
                customerProfileId: id,
                userId: user.id,
                companyId: user.companyId,
                channel: 'System',
                type: 'COMMENT',
                subject: 'Lead Converted to Customer',
                notes: `Lead was manually converted to a formal customer by ${(user as any).name || user.email}.`,
                date: new Date()
            }
        });

        return NextResponse.json({
            message: 'Lead converted successfully',
            customer: updatedCustomer
        });

    } catch (error) {
        console.error('Failed to convert lead:', error);
        return NextResponse.json({ error: 'Failed to convert lead' }, { status: 500 });
    }
}
