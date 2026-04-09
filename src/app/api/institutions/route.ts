import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

const buildAffiliationStatus = (institution: any) => {
    if (institution.type === 'UNIVERSITY') return 'UNIVERSITY';
    if (institution.universityId) return 'AFFILIATED';
    return 'SELF_AFFILIATED';
};

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
                    university: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            type: true,
                            city: true,
                            state: true
                        }
                    },
                    affiliates: {
                        include: {
                            _count: {
                                select: {
                                    customers: true,
                                    subscriptions: true
                                }
                            }
                        },
                        orderBy: { name: 'asc' }
                    },
                    agency: {
                        select: {
                            id: true,
                            name: true,
                            organizationName: true,
                            primaryEmail: true
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

            const paidCustomerIds = new Set(
                institution.subscriptions
                    .map((subscription) => subscription.customerProfileId)
                    .filter(Boolean)
            );

            const linkedPaidCustomers = institution.customers
                .filter((customer) => paidCustomerIds.has(customer.id))
                .map((customer) => {
                    const customerSubscriptions = institution.subscriptions.filter((subscription) => subscription.customerProfileId === customer.id);
                    return {
                        id: customer.id,
                        name: customer.name,
                        designation: customer.designation,
                        primaryEmail: customer.primaryEmail,
                        organizationName: customer.organizationName,
                        subscriptionCount: customerSubscriptions.length,
                        revenue: customerSubscriptions.reduce((sum, subscription) => sum + (subscription.total || 0), 0),
                        latestStatus: customerSubscriptions[0]?.status || null
                    };
                })
                .sort((a, b) => b.revenue - a.revenue);

            const affiliateIds = institution.affiliates.map((affiliate) => affiliate.id);
            const affiliateSubscriptions = affiliateIds.length
                ? await prisma.subscription.findMany({
                    where: { institutionId: { in: affiliateIds } },
                    select: { total: true, customerProfileId: true }
                })
                : [];
            const affiliateRevenue = affiliateSubscriptions.reduce((sum, subscription) => sum + (subscription.total || 0), 0);
            const affiliatePaidCustomers = new Set(
                affiliateSubscriptions.map((subscription) => subscription.customerProfileId).filter(Boolean)
            );

            return NextResponse.json({
                ...institution,
                affiliationStatus: buildAffiliationStatus(institution),
                analytics: {
                    linkedCustomerCount: institution.customers.length,
                    paidCustomerCount: paidCustomerIds.size,
                    directRevenue: institution.subscriptions.reduce((sum, subscription) => sum + (subscription.total || 0), 0),
                    affiliatedInstitutionCount: institution.affiliates.length,
                    affiliatedPaidCustomerCount: affiliatePaidCustomers.size,
                    affiliateRevenue,
                    revenueWithNetwork: institution.subscriptions.reduce((sum, subscription) => sum + (subscription.total || 0), 0) + affiliateRevenue
                },
                linkedPaidCustomers
            });
        }

        // List all institutions with pagination and basic stats
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const type = searchParams.get('type');
        const affiliation = searchParams.get('affiliation');
        const state = searchParams.get('state');
        const city = searchParams.get('city');
        const assignedTo = searchParams.get('assignedTo');
        const skip = (page - 1) * limit;

        const where: any = {};
        if (user.role !== 'SUPER_ADMIN') {
            where.companyId = user.companyId;
        }

        if (type && type !== 'ALL') where.type = type;
        if (affiliation === 'UNIVERSITY') where.type = 'UNIVERSITY';
        if (affiliation === 'AFFILIATED') where.universityId = { not: null };
        if (affiliation === 'SELF_AFFILIATED') where.universityId = null;
        if (state) where.state = { contains: state, mode: 'insensitive' };
        if (city) where.city = { contains: city, mode: 'insensitive' };
        if (assignedTo) where.assignedToUserId = assignedTo;

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
                { primaryEmail: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [institutions, total] = await Promise.all([
            prisma.institution.findMany({
                where,
                skip,
                take: limit,
                include: {
                    assignedTo: {
                        select: {
                            id: true,
                            email: true,
                            customerProfile: { select: { name: true } }
                        }
                    },
                    agency: {
                        select: {
                            id: true,
                            name: true,
                            organizationName: true
                        }
                    },
                    university: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            type: true
                        }
                    },
                    _count: {
                        select: {
                            customers: true,
                            subscriptions: true,
                            communications: true,
                            affiliates: true
                        }
                    }
                },
                orderBy: { name: 'asc' }
            }),
            prisma.institution.count({ where })
        ]);

        const institutionIds = institutions.map((institution) => institution.id);
        const subscriptions = institutionIds.length
            ? await prisma.subscription.findMany({
                where: { institutionId: { in: institutionIds } },
                select: {
                    institutionId: true,
                    customerProfileId: true,
                    total: true
                }
            })
            : [];

        const analyticsMap = subscriptions.reduce((acc: Record<string, { revenue: number; paidCustomers: Set<string> }>, subscription) => {
            if (!subscription.institutionId) return acc;
            acc[subscription.institutionId] = acc[subscription.institutionId] || {
                revenue: 0,
                paidCustomers: new Set<string>()
            };
            acc[subscription.institutionId].revenue += subscription.total || 0;
            if (subscription.customerProfileId) {
                acc[subscription.institutionId].paidCustomers.add(subscription.customerProfileId);
            }
            return acc;
        }, {});

        const peerAverageRevenue = institutions.length
            ? institutions.reduce((sum, institution) => sum + (analyticsMap[institution.id]?.revenue || 0), 0) / institutions.length
            : 0;

        const enrichedInstitutions = institutions.map((institution) => ({
            ...institution,
            affiliationStatus: buildAffiliationStatus(institution),
            analytics: {
                paidCustomerCount: analyticsMap[institution.id]?.paidCustomers.size || 0,
                totalRevenue: analyticsMap[institution.id]?.revenue || 0,
                revenueVsPeerAverage: (analyticsMap[institution.id]?.revenue || 0) - peerAverageRevenue
            }
        }));

        return NextResponse.json({
            data: enrichedInstitutions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
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
            totalStudents,
            totalFaculty,
            totalStaff,
            libraryBudget,
            ipRange,
            notes,
            logo,
            assignedToUserId,
            agencyId,
            universityId
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
                billingAddress,
                billingCity,
                billingState,
                billingCountry: billingCountry || 'India',
                billingPincode,
                shippingAddress,
                shippingCity,
                shippingState,
                shippingCountry: shippingCountry || 'India',
                shippingPincode,
                totalStudents: totalStudents ? parseInt(totalStudents) : null,
                totalFaculty: totalFaculty ? parseInt(totalFaculty) : null,
                totalStaff: totalStaff ? parseInt(totalStaff) : null,
                libraryBudget: libraryBudget ? parseFloat(libraryBudget) : null,
                ipRange,
                notes,
                logo,
                assignedToUserId: assignedToUserId || null, // Add ownership to executive
                agencyId: agencyId || null,
                universityId: universityId || null,
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
        if (updateData.universityId === '') updateData.universityId = null;
        if (updateData.agencyId === '') updateData.agencyId = null;

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
