import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { target, subject, message } = body;

        if (!target || !subject || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Fetch target customers
        const where: any = {};
        if (target !== 'ALL') {
            where.customerType = target;
        }

        const customers = await prisma.customerProfile.findMany({
            where,
            select: { name: true, primaryEmail: true, id: true }
        });

        if (customers.length === 0) {
            return NextResponse.json({ error: 'No customers found for the selected target' }, { status: 404 });
        }

        // 2. Send Emails (Iteratively for now, ideally queued in a worker)
        const results = {
            success: 0,
            failed: 0,
            total: customers.length
        };

        for (const customer of customers) {
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
                        <h2 style="margin: 0;">STM Journals</h2>
                    </div>
                    <div style="padding: 30px; line-height: 1.6; color: #1e293b;">
                        <p>Dear <strong>${customer.name}</strong>,</p>
                        <div style="margin: 20px 0;">
                            ${message.replace(/\n/g, '<br/>')}
                        </div>
                        <p style="margin-top: 40px; font-size: 14px; color: #64748b;">
                            Best regards,<br/>
                            <strong>STM Journals Team</strong><br/>
                            Subscription Management Division
                        </p>
                    </div>
                    <div style="background: #f8fafc; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px;">
                        You are receiving this as a registered customer of STM Journals.
                    </div>
                </div>
            `;

            const emailRes = await sendEmail({
                to: customer.primaryEmail,
                subject,
                text: message,
                html
            });

            if (emailRes.success) {
                results.success++;
                // Log communication record
                await prisma.communicationLog.create({
                    data: {
                        customerProfileId: customer.id,
                        userId: decoded.id,
                        channel: 'EMAIL',
                        subject: `Bulk Blast: ${subject}`,
                        notes: 'System generated bulk communication',
                        type: 'EMAIL',
                        outcome: 'sent'
                    }
                });
            } else {
                results.failed++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Bulk email processing complete. Sent: ${results.success}, Failed: ${results.failed}`,
            results
        });

    } catch (error: any) {
        console.error('Bulk Email Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
