import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { sendEmail, EmailTemplates } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        // Always return success to prevent email enumeration
        // But only send email if user exists
        if (user) {
            // Generate secure random token
            const token = crypto.randomBytes(32).toString('hex');

            // Set expiration to 1 hour from now
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

            // Delete any existing tokens for this user
            await prisma.passwordResetToken.deleteMany({
                where: { userId: user.id },
            });

            // Create new reset token
            await prisma.passwordResetToken.create({
                data: {
                    token,
                    userId: user.id,
                    expiresAt,
                },
            });

            // TODO: Send email with reset link
            // For now, log the token (in production, this should send an email)
            const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

            logger.info('Password reset requested', { userId: user.id });

            // Send email
            const template = EmailTemplates.forgotPassword(user.name || user.email, resetUrl);
            await sendEmail({
                to: email,
                subject: template.subject,
                text: template.text,
                html: template.html,
            });
        }

        // Always return success message
        return NextResponse.json({
            message: 'If an account with that email exists, a password reset link has been sent.',
        });

    } catch (error) {
        logger.error('Forgot password error', error);
        return NextResponse.json(
            { error: 'An error occurred while processing your request' },
            { status: 500 }
        );
    }
}
