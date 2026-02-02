import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth-legacy';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json(
                { error: 'Token and password are required' },
                { status: 400 }
            );
        }

        // Validate password strength
        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        // Find the reset token
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!resetToken) {
            return NextResponse.json(
                { error: 'Invalid or expired reset token' },
                { status: 400 }
            );
        }

        // Check if token has expired
        if (resetToken.expiresAt < new Date()) {
            // Delete expired token
            await prisma.passwordResetToken.delete({
                where: { id: resetToken.id },
            });

            return NextResponse.json(
                { error: 'Reset token has expired. Please request a new one.' },
                { status: 400 }
            );
        }

        // Check if token has already been used
        if (resetToken.used) {
            return NextResponse.json(
                { error: 'This reset token has already been used' },
                { status: 400 }
            );
        }

        // Hash the new password
        const hashedPassword = await hashPassword(password);

        // Update user password and mark token as used
        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetToken.userId },
                data: { password: hashedPassword },
            }),
            prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true },
            }),
        ]);

        // Delete all reset tokens for this user
        await prisma.passwordResetToken.deleteMany({
            where: { userId: resetToken.userId },
        });

        logger.info('Password reset successful', { userId: resetToken.userId });

        // TODO: Send confirmation email
        /*
        await sendEmail({
            to: resetToken.user.email,
            subject: 'Password Reset Successful',
            html: `
                <h1>Password Reset Successful</h1>
                <p>Your password has been successfully reset.</p>
                <p>If you didn't make this change, please contact support immediately.</p>
            `,
        });
        */

        return NextResponse.json({
            message: 'Password has been reset successfully. You can now log in with your new password.',
        });

    } catch (error) {
        logger.error('Reset password error', error);
        return NextResponse.json(
            { error: 'An error occurred while resetting your password' },
            { status: 500 }
        );
    }
}
