import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const profile = await prisma.employeeProfile.findFirst({
                where: { userId: user.id },
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true,
                            role: true,
                            companies: { select: { name: true, website: true, address: true, logoUrl: true } },
                            department: { select: { id: true, name: true } }
                        }
                    },
                    documents: true,
                    digitalDocuments: true,
                    designatRef: true,
                    incrementHistory: {
                        where: { status: 'APPROVED' },
                        orderBy: { effectiveDate: 'desc' }
                    }
                }
            });

            if (!profile) return createErrorResponse('Profile not found', 404);

            // Flatten department for frontend compatibility
            const response = {
                ...profile,
                department: profile.user?.department
            };

            return NextResponse.json(response);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PUT = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { dateOfBirth, phoneNumber, emergencyContact, bloodGroup, address, bankName, accountNumber, ifscCode } = body;

            // Find profile
            const profile = await prisma.employeeProfile.findFirst({
                where: { userId: user.id }
            });

            if (!profile) return createErrorResponse('Profile not found', 404);

            const updated = await prisma.employeeProfile.update({
                where: { id: profile.id },
                data: {
                    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
                    phoneNumber,
                    emergencyContact,
                    bloodGroup,
                    address,
                    bankName,
                    accountNumber,
                    ifscCode
                }
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
