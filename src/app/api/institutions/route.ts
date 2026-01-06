import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (id) {
            // Get single institution with stats
            const institution = await prisma.institution.findUnique({
                where: { id },
                include: {
                    customers: {
                        include: {
                            user: { select: { email: true, isActive: true } },
                            subscriptions: true
                        }
                    },
                    subscriptions: {
                        include: {
                            items: true
                        }
                    },
                    communications: {
                        orderBy: { date: 'desc' },
                        take: 10
                    },
                    _count: {
                        select: {
                            customers: true,
                            subscriptions: true,
                            communications: true
                        }
                    }
                }
            });

            if (!institution) {
                return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
            }

            return NextResponse.json(institution);
        }

        // List all institutions with basic stats
        const where: any = {};
        if (user.role !== 'SUPER_ADMIN') {
            where.companyId = user.companyId;
        }

        const institutions = await prisma.institution.findMany({
            where,
            include: {
                _count: {
                    select: {
                        customers: true,
                        subscriptions: true,
                        communications: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(institutions);
    } catch (error: any) {
        console.error('Institutions API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const {
            name,
            code,
            type,
            category,
            establishedYear,
            accreditation,
            primaryEmail,
            secondaryEmail,
            primaryPhone,
            secondaryPhone,
            website,
            address,
            city,
            state,
            country,
            pincode,
            totalStudents,
            totalFaculty,
            totalStaff,
            libraryBudget,
            ipRange,
            notes,
            logo
        } = body;

        const institution = await prisma.institution.create({
            data: {
                name,
                code,
                type,
                category,
                establishedYear: establishedYear ? parseInt(establishedYear) : null,
                accreditation,
                primaryEmail,
                secondaryEmail,
                primaryPhone,
                secondaryPhone,
                website,
                address,
                city,
                state,
                country: country || 'India',
                pincode,
                totalStudents: totalStudents ? parseInt(totalStudents) : null,
                totalFaculty: totalFaculty ? parseInt(totalFaculty) : null,
                totalStaff: totalStaff ? parseInt(totalStaff) : null,
                libraryBudget: libraryBudget ? parseFloat(libraryBudget) : null,
                ipRange,
                notes,
                logo,
                companyId: user.companyId
            }
        });

        return NextResponse.json(institution, { status: 201 });
    } catch (error: any) {
        console.error('Create Institution Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: 'Institution ID required' }, { status: 400 });
        }

        // Convert numeric fields
        if (updateData.establishedYear) updateData.establishedYear = parseInt(updateData.establishedYear);
        if (updateData.totalStudents) updateData.totalStudents = parseInt(updateData.totalStudents);
        if (updateData.totalFaculty) updateData.totalFaculty = parseInt(updateData.totalFaculty);
        if (updateData.totalStaff) updateData.totalStaff = parseInt(updateData.totalStaff);
        if (updateData.libraryBudget) updateData.libraryBudget = parseFloat(updateData.libraryBudget);

        const institution = await prisma.institution.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json(institution);
    } catch (error: any) {
        console.error('Update Institution Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Institution ID required' }, { status: 400 });
        }

        await prisma.institution.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete Institution Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
