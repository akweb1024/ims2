import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { logger } from '@/lib/logger';
import { buildTrackingMetadata } from '@/lib/dispatch';
import { deriveStateCodeFromState } from '@/lib/india-state-code';
import { userHasCompanyAccess } from '@/lib/access-policy';
import { CRM_CUSTOMER_EDITOR_ROLES } from '@/lib/crm-access';

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
const DISCOUNT_EDITOR_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER']);

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
        const customer = await prisma.customerProfile.findFirst({
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
                discountUpdatedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
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
                    include: {
                        dispatchOrders: {
                            include: {
                                courier: true
                            },
                            orderBy: [{ fulfillmentType: 'asc' }, { cycleNumber: 'asc' }]
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                dispatchOrders: {
                    include: {
                        courier: true,
                        invoice: {
                            select: {
                                id: true,
                                invoiceNumber: true,
                                proformaNumber: true,
                                total: true,
                                currency: true,
                                status: true,
                                createdAt: true,
                            }
                        }
                    },
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

        const hasPrimaryCompanyAccess = await userHasCompanyAccess(decoded as any, customer.companyId);
        const hasSharedCompanyAccess = Array.isArray((customer as any).sharedCompanyIds)
            ? await Promise.all((customer as any).sharedCompanyIds.map((companyId: string) => userHasCompanyAccess(decoded as any, companyId)))
            : [];
        const hasCompanyAccess = hasPrimaryCompanyAccess || hasSharedCompanyAccess.some(Boolean);
        if (!hasCompanyAccess) {
            return NextResponse.json({ error: 'Forbidden: You do not have access to this company' }, { status: 403 });
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

        return NextResponse.json({
            ...customer,
            invoices: customer.invoices.map((invoice: any) => ({
                ...invoice,
                dispatchOrders: Array.isArray(invoice.dispatchOrders)
                    ? invoice.dispatchOrders.map((dispatch: any) => ({
                        ...dispatch,
                        tracking: buildTrackingMetadata(dispatch),
                    }))
                    : [],
                dispatchOrder: Array.isArray(invoice.dispatchOrders) && invoice.dispatchOrders[0]
                    ? {
                        ...invoice.dispatchOrders[0],
                        tracking: buildTrackingMetadata(invoice.dispatchOrders[0]),
                    }
                    : null,
            })),
            dispatchOrders: (customer as any).dispatchOrders.map((dispatch: any) => ({
                ...dispatch,
                tracking: buildTrackingMetadata(dispatch),
            })),
        });

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
        if (!decoded || !CRM_CUSTOMER_EDITOR_ROLES.has(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const existingCustomer = await prisma.customerProfile.findFirst({
            where:
                decoded.role === 'SUPER_ADMIN'
                    ? { id }
                    : {
                        id,
                        OR: [
                            { companyId: decoded.companyId || undefined },
                            decoded.companyId ? { sharedCompanyIds: { has: decoded.companyId } } : undefined
                        ].filter(Boolean) as any
                    },
            select: {
                id: true,
                assignedToUserId: true,
                assignedExecutives: { select: { id: true } },
                companyId: true,
                sharedCompanyIds: true,
            },
        });

        if (!existingCustomer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        if (decoded.role === 'EXECUTIVE') {
            const isAssigned =
                existingCustomer.assignedToUserId === decoded.id ||
                existingCustomer.assignedExecutives.some((e) => e.id === decoded.id);
            if (!isAssigned) {
                return NextResponse.json({ error: 'Forbidden: You are not assigned to this customer' }, { status: 403 });
            }
        }

        const body = await req.json();
        const {
            institutionDetails,
            assignedToUserId,
            assignedToUserIds, // Array of IDs
            sharedCompanyIds,
            website, // Extracting website to omit it from profileData since it is not in the schema
            ...profileData
        } = body;
        const canEditDefaultDiscount = DISCOUNT_EDITOR_ROLES.has(decoded.role);

        const cleanAssignedExecutiveIds = Array.isArray(assignedToUserIds)
            ? assignedToUserIds
                .map((value: unknown) => String(value).trim())
                .filter((value: string) => value.length > 0)
            : undefined;
        const normalizedSharedCompanyIds = Array.isArray(sharedCompanyIds)
            ? Array.from(new Set(sharedCompanyIds.map((value: unknown) => String(value).trim()).filter(Boolean)))
                .filter((companyId) => companyId !== existingCustomer.companyId)
            : undefined;
        if (normalizedSharedCompanyIds) {
            for (const sharedCompanyId of normalizedSharedCompanyIds) {
                const hasAccess = await userHasCompanyAccess(decoded as any, sharedCompanyId);
                if (!hasAccess) {
                    return NextResponse.json({ error: `Forbidden: You do not have access to company ${sharedCompanyId}` }, { status: 403 });
                }
            }
        }

        const customerProfileData = {
            ...(profileData.name !== undefined && { name: String(profileData.name) }),
            ...(profileData.organizationName !== undefined && { organizationName: toNullableString(profileData.organizationName) }),
            ...(profileData.primaryPhone !== undefined && { primaryPhone: String(profileData.primaryPhone) }),
            ...(profileData.secondaryEmail !== undefined && { secondaryEmail: toNullableString(profileData.secondaryEmail) }),
            ...(profileData.designation !== undefined && { designation: toNullableString(profileData.designation) }),
            
            ...(profileData.customerType !== undefined && { customerType: profileData.customerType }),
            ...(profileData.organizationType !== undefined && { organizationType: toNullableString(profileData.organizationType) as any }),
            ...(profileData.governanceType !== undefined && { governanceType: toNullableString(profileData.governanceType) as any }),
            ...(profileData.universityCategory !== undefined && { 
                universityCategory: (toNullableString(profileData.universityCategory) === 'STATE' ? 'STATE_UNIVERSITY' :
                                   toNullableString(profileData.universityCategory) === 'CENTRAL' ? 'CENTRAL_UNIVERSITY' :
                                   toNullableString(profileData.universityCategory) === 'PRIVATE' ? 'PRIVATE_UNIVERSITY' :
                                   toNullableString(profileData.universityCategory)) as any 
            }),
            ...(canEditDefaultDiscount && profileData.discountOffered !== undefined && { discountOffered: Number(profileData.discountOffered) }),
            ...(canEditDefaultDiscount && profileData.defaultDiscountType !== undefined && {
                defaultDiscountType: String(profileData.defaultDiscountType).trim().toUpperCase() === 'FLAT' ? 'FLAT' : 'PERCENTAGE'
            }),
            ...(canEditDefaultDiscount && profileData.defaultDiscountValue !== undefined && {
                defaultDiscountValue: Number(profileData.defaultDiscountValue) || 0
            }),
            ...(profileData.region !== undefined && { region: toNullableString(profileData.region) }),

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
            ...(profileData.shippingEnduserName !== undefined && { shippingEnduserName: toNullableString(profileData.shippingEnduserName) }),
            ...(profileData.gstVatTaxId !== undefined && { gstVatTaxId: toNullableString(profileData.gstVatTaxId) }),
        };

        const resolvedBillingStateCode = deriveStateCodeFromState(
            profileData.billingStateCode,
            profileData.billingState,
        );
        const resolvedShippingStateCode = deriveStateCodeFromState(
            profileData.shippingStateCode,
            profileData.shippingState || profileData.billingState,
        );

        if (profileData.billingState !== undefined || profileData.billingStateCode !== undefined) {
            (customerProfileData as any).billingStateCode = resolvedBillingStateCode || null;
        }
        if (profileData.shippingState !== undefined || profileData.shippingStateCode !== undefined) {
            (customerProfileData as any).shippingStateCode =
                resolvedShippingStateCode ||
                resolvedBillingStateCode ||
                null;
        }

        const result = await prisma.$transaction(async (tx) => {
            const updatedProfile = await tx.customerProfile.update({
                where: { id: id },
                data: {
                    ...(customerProfileData as any),
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
                    ...(profileData.affiliatedUniversityId !== undefined && {
                        affiliatedUniversity: toNullableString(profileData.affiliatedUniversityId)
                            ? { connect: { id: String(toNullableString(profileData.affiliatedUniversityId)) } }
                            : { disconnect: true }
                    }),
                    ...(profileData.associatedAgencyId !== undefined && {
                        associatedAgencyCentral: toNullableString(profileData.associatedAgencyId)
                            ? { connect: { id: String(toNullableString(profileData.associatedAgencyId)) } }
                            : { disconnect: true }
                    }),
                    ...(cleanAssignedExecutiveIds !== undefined && {
                        assignedExecutives: {
                            set: cleanAssignedExecutiveIds.map((uid: string) => ({ id: uid }))
                        }
                    }),
                    ...(normalizedSharedCompanyIds !== undefined && {
                        sharedCompanyIds: normalizedSharedCompanyIds
                    }),
                    ...(canEditDefaultDiscount && (profileData.defaultDiscountType !== undefined || profileData.defaultDiscountValue !== undefined) && {
                        discountUpdatedAt: new Date(),
                        discountUpdatedById: decoded.id
                    })
                }
            });

            if (institutionDetails && (updatedProfile.organizationType === 'INSTITUTION' || updatedProfile.organizationType === 'UNIVERSITY')) {
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

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const decoded = await getAuthenticatedUser();

        if (!decoded || !['SUPER_ADMIN', 'ADMIN'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden: Only Super Admin or Admin can delete customers' }, { status: 403 });
        }

        const customer = await prisma.customerProfile.findFirst({
            where:
                decoded.role === 'SUPER_ADMIN'
                    ? { id }
                    : { id, companyId: decoded.companyId },
            select: { id: true, name: true, userId: true, notes: true }
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        await prisma.$transaction(async (tx) => {
            if (customer.userId) {
                await tx.user.update({
                    where: { id: customer.userId },
                    data: { isActive: false }
                });
            }

            const deactivationNote = `[${new Date().toISOString()}] Customer deactivated by ${decoded.id}; profile retained for invoice, subscription, dispatch, and communication history.`;
            await tx.customerProfile.update({
                where: { id },
                data: {
                    notes: customer.notes
                        ? `${customer.notes}\n${deactivationNote}`
                        : deactivationNote
                }
            });

            await tx.auditLog.create({
                data: {
                    userId: decoded.id,
                    action: 'deactivate',
                    entity: 'customer_profile',
                    entityId: id,
                    changes: JSON.stringify({ name: customer.name, deactivatedBy: decoded.id })
                }
            });
        });

        return NextResponse.json({ success: true, message: 'Customer deactivated successfully' });

    } catch (error) {
        logger.error('Delete Customer Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}
