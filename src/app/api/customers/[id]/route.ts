import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { logger } from '@/lib/logger';

const toNullableString = (value: unknown) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const str = String(value).trim();
    return str === '' ? null : str;
};

const CUSTOMER_DESIGNATIONS = new Set([
    'STUDENT',
    'TEACHER',
    'FACULTY',
    'HOD',
    'PRINCIPAL',
    'DEAN',
    'RESEARCHER',
    'LIBRARIAN',
    'ACCOUNTANT',
    'DIRECTOR',
    'REGISTRAR',
    'VICE_CHANCELLOR',
    'CHANCELLOR',
    'STAFF',
    'OTHER',
]);

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
                agencyDetails: {
                    include: {
                        performance: true,
                        subscriptions: {
                            include: {
                                items: {
                                    include: { journal: true }
                                },
                                invoices: true
                            },
                            orderBy: { createdAt: 'desc' }
                        }
                    }
                },
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
                    include: {
                        user: { select: { id: true, email: true, role: true } },
                        checklist: true
                    },
                    orderBy: { date: 'desc' }
                },
                invoices: {
                    orderBy: { createdAt: 'desc' }
                },
                agencyInstitutions: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true,
                        city: true,
                        state: true,
                        isActive: true
                    }
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

        if (decoded.role === 'AGENCY') {
            const agencyProfile = await prisma.customerProfile.findUnique({
                where: { userId: decoded.id },
                select: { id: true }
            });

            const isOwnAgencyRecord = agencyProfile?.id === customer.id;
            const isAgencyClient = customer.agencyId === agencyProfile?.id;

            if (!agencyProfile || (!isOwnAgencyRecord && !isAgencyClient)) {
                return NextResponse.json({ error: 'Forbidden: This client is not linked to your agency' }, { status: 403 });
            }
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
        logger.error('Customer Details Error:', error);
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
        if (!decoded || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const {
            institutionDetails,
            assignedToUserId,
            assignedToUserIds, // Array of IDs
            website, // Extracting website to omit it from profileData since it is not in the schema
            ...profileData
        } = body;

        const cleanAssignedExecutiveIds = Array.isArray(assignedToUserIds)
            ? assignedToUserIds
                .map((value: unknown) => String(value).trim())
                .filter((value: string) => value.length > 0)
            : undefined;

        const customerProfileData = {
            ...(profileData.name !== undefined && { name: String(profileData.name) }),
            ...(profileData.organizationName !== undefined && { organizationName: toNullableString(profileData.organizationName) }),
            ...(profileData.primaryPhone !== undefined && { primaryPhone: String(profileData.primaryPhone) }),
            ...(profileData.secondaryEmail !== undefined && { secondaryEmail: toNullableString(profileData.secondaryEmail) }),
            ...(profileData.designation !== undefined && {
                designation: (() => {
                    const designation = toNullableString(profileData.designation);
                    return designation && CUSTOMER_DESIGNATIONS.has(designation) ? designation as any : null;
                })()
            }),
            ...(profileData.billingAddress !== undefined && { billingAddress: toNullableString(profileData.billingAddress) }),
            ...(profileData.billingCity !== undefined && { billingCity: toNullableString(profileData.billingCity) }),
            ...(profileData.billingState !== undefined && { billingState: toNullableString(profileData.billingState) }),
            ...(profileData.billingStateCode !== undefined && { billingStateCode: toNullableString(profileData.billingStateCode) }),
            ...(profileData.billingPincode !== undefined && { billingPincode: toNullableString(profileData.billingPincode) }),
            ...(profileData.billingCountry !== undefined && { billingCountry: toNullableString(profileData.billingCountry) ?? 'India' }),
            ...(profileData.shippingAddress !== undefined && { shippingAddress: toNullableString(profileData.shippingAddress) }),
            ...(profileData.shippingCity !== undefined && { shippingCity: toNullableString(profileData.shippingCity) }),
            ...(profileData.shippingState !== undefined && { shippingState: toNullableString(profileData.shippingState) }),
            ...(profileData.shippingStateCode !== undefined && { shippingStateCode: toNullableString(profileData.shippingStateCode) }),
            ...(profileData.shippingPincode !== undefined && { shippingPincode: toNullableString(profileData.shippingPincode) }),
            ...(profileData.shippingCountry !== undefined && { shippingCountry: toNullableString(profileData.shippingCountry) ?? 'India' }),
            ...(profileData.gstVatTaxId !== undefined && { gstVatTaxId: toNullableString(profileData.gstVatTaxId) }),
        };

        const result = await prisma.$transaction(async (tx) => {
            const updatedProfile = await tx.customerProfile.update({
                where: { id: id },
                data: {
                    ...customerProfileData,
                    ...(assignedToUserId !== undefined && {
                        assignedTo: toNullableString(assignedToUserId)
                            ? { connect: { id: String(toNullableString(assignedToUserId)) } }
                            : { disconnect: true }
                    }),
                    ...(profileData.institutionId !== undefined && {
                        institution: toNullableString(profileData.institutionId)
                            ? { connect: { id: String(toNullableString(profileData.institutionId)) } }
                            : { disconnect: true }
                    }),
                    ...(cleanAssignedExecutiveIds !== undefined && {
                        assignedExecutives: {
                            set: cleanAssignedExecutiveIds.map((uid: string) => ({ id: uid }))
                        }
                    })
                }
            });

            if (institutionDetails && updatedProfile.customerType === 'INSTITUTION') {
                const mappedInstitutionDetails = {
                    category: toNullableString(institutionDetails.category) || toNullableString(institutionDetails.vspName) || 'GENERAL',
                    ipRange: toNullableString(institutionDetails.ipRange) || toNullableString(institutionDetails.ipRanges),
                    numberOfUsers: institutionDetails.numberOfUsers ?? institutionDetails.totalUsers ?? null,
                    numberOfSeats: institutionDetails.numberOfSeats ?? institutionDetails.totalSeats ?? null,
                    department: toNullableString(institutionDetails.department),
                    libraryContact: toNullableString(institutionDetails.libraryContact),
                };

                await tx.institutionDetails.upsert({
                    where: { customerProfileId: id },
                    update: mappedInstitutionDetails,
                    create: {
                        ...mappedInstitutionDetails,
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
        logger.error('Update Customer Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}
