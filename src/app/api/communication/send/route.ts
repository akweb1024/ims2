import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { sendEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { recipients, subject, message, type } = body;
            // type could be 'INDIVIDUAL' | 'BULK' | 'ROLE'

            if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
                return createErrorResponse('Recipients list is required', 400);
            }
            if (!subject || !message) {
                return createErrorResponse('Subject and Message are required', 400);
            }

            // In a real bulk system, we would use a queue (SQS/Redis).
            // For now, we will map through and send (limit to reasonable batch size).

            const results = {
                success: 0,
                failed: 0,
                errors: [] as any[]
            };

            // Limit to 50 for immediate response to avoid timeout
            const batch = recipients.slice(0, 50);

            await Promise.all(batch.map(async (email: string) => {
                const res = await sendEmail({
                    to: email,
                    subject,
                    text: message, // Fallback
                    html: `<div style="font-family: sans-serif; padding: 20px;">
                            ${message.replace(/\n/g, '<br/>')}
                            <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;"/>
                            <p style="font-size: 12px; color: #888;">Sent via STM Internal Dashboard by ${user.email}</p>
                           </div>`
                });

                if (res.success) results.success++;
                else {
                    results.failed++;
                    results.errors.push({ email, error: res.error });
                }
            }));

            // Log communication in background (optional)
            // await prisma.communicationLog.create(...)

            return NextResponse.json({
                message: `Processed ${batch.length} emails`,
                stats: results
            });

        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
