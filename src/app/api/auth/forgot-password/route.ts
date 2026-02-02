import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

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

            // In production, you would send an email here:
            /*
            await sendEmail({
                to: email,
                subject: 'Password Reset Request',
                html: `
                    <h1>Password Reset Request</h1>
                    <p>You requested to reset your password. Click the link below to reset it:</p>
                    <a href="${resetUrl}">Reset Password</a>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                `,
            });
            */
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
