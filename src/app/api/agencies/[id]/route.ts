import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// GET: Single Agency Details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Try CustomerProfile first
        let agency: any = await prisma.customerProfile.findUnique({
            where: { id },
            include: {
                agencyDetails: true,
                subscriptions: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                _count: {
                    select: { subscriptions: true }
                }
            }
        });

        // If not found, try Institution
        if (!agency) {
            const inst = await prisma.institution.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: { subscriptions: true }
                    }
                }
            });

            if (inst && inst.type === 'AGENCY') {
                agency = {
                    ...inst,
                    customerType: 'AGENCY',
                    isInstitution: true,
                    agencyDetails: {
                        discountRate: 0,
                        territory: inst.city || '',
                    }
                };
            }
        }

        if (!agency) {
            return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
        }

        return NextResponse.json(agency);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update Agency
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const {
            name,
            organizationName,
            primaryPhone,
            discountRate,
            commissionTerms,
            territory,
            isInstitution,
            billingAddress,
            billingCity,
            billingState,
            billingCountry,
            billingPincode,
            shippingAddress,
            shippingCity,
            shippingState,
            shippingCountry,
            shippingPincode
        } = body;

        if (isInstitution) {
            const updated = await prisma.institution.update({
                where: { id },
                data: {
                    name,
                    primaryPhone,
                    city: territory, // Map territory back to city for institutes or add specific fields
                }
            });
            return NextResponse.json({ ...updated, isInstitution: true });
        }

        const updated = await prisma.customerProfile.update({
            where: { id },
            data: {
                name,
                organizationName,
                primaryPhone,
                billingAddress,
                billingCity,
                billingState,
                billingCountry,
                billingPincode,
                shippingAddress,
                shippingCity,
                shippingState,
                shippingCountry,
                shippingPincode,
                agencyDetails: {
                    update: {
                        discountRate: parseFloat(discountRate || '0'),
                        commissionTerms,
                        territory
                    }
                }
            },
            include: {
                agencyDetails: true
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Delete Agency
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;

        const profile = await prisma.customerProfile.findFirst({
            where: {
                id,
                customerType: "ORGANIZATION",
                organizationType: "AGENCY",
                ...(user.role === "SUPER_ADMIN" ? {} : { companyId: user.companyId }),
            },
            select: { id: true, userId: true }
        });

        if (profile) {
            if (profile.userId) {
                await prisma.user.update({
                    where: { id: profile.userId },
                    data: { isActive: false }
                });
            }
            return NextResponse.json({ success: true, action: 'deactivated' });
        }

        const institution = await prisma.institution.updateMany({
            where: {
                id,
                type: 'AGENCY',
                ...(user.role === "SUPER_ADMIN" ? {} : { companyId: user.companyId }),
                isActive: true
            },
            data: { isActive: false }
        });

        if (institution.count === 0) {
            return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, action: 'deactivated' });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
