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

        const agency = await prisma.customerProfile.findUnique({
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
            territory
        } = body;

        const updated = await prisma.customerProfile.update({
            where: { id },
            data: {
                name,
                organizationName,
                primaryPhone,
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

        const { id } = await params;

        // Ideally soft delete or check for subscriptions
        // For now, cascade delete will handle it via schema
        await prisma.customerProfile.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
