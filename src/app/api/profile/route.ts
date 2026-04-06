import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: {
                customerProfile: true,
                company: true
            }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const { password, ...safeUser } = user;
        return NextResponse.json(safeUser);

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const body = await req.json();
        const { currentPassword, newPassword, name, primaryPhone } = body;

        // Change password logic
        if (currentPassword && newPassword) {
            const user = await prisma.user.findUnique({ where: { id: decoded.id } });
            if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await prisma.user.update({
                where: { id: decoded.id },
                data: { password: hashedPassword }
            });

            return NextResponse.json({ message: 'Password updated successfully' });
        }

        // Update profile info
        if (name || primaryPhone) {
            const updateData: any = {};
            if (name) updateData.name = name;
            if (primaryPhone) updateData.primaryPhone = primaryPhone;

            // Check if customer profile exists
            const customerProfile = await prisma.customerProfile.findUnique({
                where: { userId: decoded.id }
            });

            if (customerProfile) {
                const updated = await prisma.customerProfile.update({
                    where: { userId: decoded.id },
                    data: updateData
                });
                return NextResponse.json(updated);
            } else {
                // For non-customers, we might want to update the User name
                if (name) {
                    const updatedUser = await prisma.user.update({
                        where: { id: decoded.id },
                        data: { name: name as string }
                    });
                    return NextResponse.json(updatedUser);
                }
                return NextResponse.json({ message: 'No customer profile to update' });
            }
        }

        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
