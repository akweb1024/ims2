import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Verify Authentication
        const decoded = await getAuthenticatedUser();
        if (!decoded) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 2. Fetch Customer Details
        const customer = await prisma.customerProfile.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        email: true,
                        role: true,
                        isActive: true,
                        lastLogin: true,
                        createdAt: true
                    }
                },
                institutionDetails: true,
                agencyDetails: true,
                assignedTo: {
                    select: { id: true, email: true, role: true }
                },
                assignedExecutives: {
                    select: { id: true, email: true, role: true }
                },
                institution: {
                    select: { id: true, name: true, code: true, type: true }
                },
                assignments: {
                    where: { isActive: true },
                    include: {
                        employee: {
                            select: { id: true, email: true, role: true }
                        }
                    }
                },
                subscriptions: {
                    include: {
                        items: {
                            include: { journal: true }
                        },
                        invoices: true
                    },
                    orderBy: { createdAt: 'desc' }
                },
                communications: {
                    include: { user: { select: { id: true, email: true, role: true } } },
                    orderBy: { date: 'desc' }
                }
            } as any
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // 3. Authorization Check (for Executives)
        const isAssigned = customer.assignedToUserId === decoded.id ||
            ((customer as any).assignedExecutives as any[]).some((e) => e.id === decoded.id);

        if (decoded.role === 'EXECUTIVE' && !isAssigned) {
            return NextResponse.json({ error: 'Forbidden: You are not assigned to this customer' }, { status: 403 });
        }

        // Apply restricted visibility for communications
        if (decoded.role === 'EXECUTIVE') {
            (customer as any).communications = (customer as any).communications.map((log: any) => {
                if (log.userId !== decoded.id) {
                    return {
                        ...log,
                        notes: '*** Restricted ***',
                        subject: '*** Restricted ***',
                    };
                }
                return log;
            });
        }

        return NextResponse.json(customer);

    } catch (error) {
        console.error('Customer Details Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const {
            institutionDetails,
            assignedToUserId,
            assignedToUserIds, // Array of IDs
            ...profileData
        } = body;

        const result = await prisma.$transaction(async (tx) => {
            const updatedProfile = await tx.customerProfile.update({
                where: { id: id },
                data: {
                    ...profileData,
                    ...(assignedToUserId !== undefined && { assignedToUserId }),
                    ...(assignedToUserIds !== undefined && {
                        assignedExecutives: {
                            set: assignedToUserIds.map((uid: string) => ({ id: uid }))
                        }
                    })
                }
            });

            if (institutionDetails && updatedProfile.customerType === 'INSTITUTION') {
                await tx.institutionDetails.upsert({
                    where: { customerProfileId: id },
                    update: institutionDetails,
                    create: {
                        ...institutionDetails,
                        customerProfileId: id
                    }
                });
            }

            await tx.auditLog.create({
                data: {
                    userId: decoded.id,
                    action: 'update',
                    entity: 'customer_profile',
                    entityId: id,
                    changes: JSON.stringify(body)
                }
            });

            return updatedProfile;
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error('Update Customer Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}
