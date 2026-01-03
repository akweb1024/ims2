import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { CustomerType } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data } = await req.json();

        if (!Array.isArray(data)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        let createdCount = 0;
        let skippedCount = 0;

        for (const rawItem of data) {
            const item: any = {};
            Object.keys(rawItem).forEach(key => {
                item[key.toLowerCase().replace(/\s/g, '')] = rawItem[key];
            });

            const email = item.primaryemail || item.email;
            const name = item.name || item.customername;

            if (!email || !name) {
                skippedCount++;
                continue;
            }

            // Check if user or profile already exists
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                skippedCount++;
                continue;
            }

            const type = (item.customertype || item.type || 'INDIVIDUAL').toUpperCase() as CustomerType;
            const role = type === 'AGENCY' ? 'AGENCY' : 'CUSTOMER';
            const hashedPassword = await bcrypt.hash('customer123', 12);

            // Create User and Profile in a transaction
            await prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: {
                        email,
                        password: hashedPassword,
                        role,
                        companyId: decoded.companyId,
                        isActive: true
                    }
                });

                await tx.customerProfile.create({
                    data: {
                        userId: user.id,
                        customerType: type,
                        name: name,
                        primaryEmail: email,
                        organizationName: item.organizationname || item.college || item.university,
                        primaryPhone: item.primaryphone || item.phone || '--',
                        country: item.country,
                        state: item.state,
                        city: item.city,
                        companyId: decoded.companyId
                    }
                });
            });

            createdCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Successfully imported ${createdCount} customers. ${skippedCount} items skipped.`
        });

    } catch (error: any) {
        console.error('Customer Import Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
