import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { ConflictError, handleApiError, ValidationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { buildCustomerTypeWhere } from '@/lib/customer-filter';
import { deriveStateCodeFromState } from '@/lib/india-state-code';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
    // Fetch customers with filtering and assignment
    try {
        // 2. Query Params
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const type = searchParams.get('type');
        const state = searchParams.get('state');
        const country = searchParams.get('country');
        const includeTypeCounts = searchParams.get('includeTypeCounts') === 'true';

        const skip = (page - 1) * limit;

        const where: Prisma.CustomerProfileWhereInput = {};
        const baseWhere: Prisma.CustomerProfileWhereInput = {};
        const userCompanyId = user.companyId;

        if (userCompanyId) {
            where.companyId = userCompanyId;
            where.leadStatus = null; // Exclude leads
            baseWhere.companyId = userCompanyId;
            baseWhere.leadStatus = null; // Exclude leads
        }

        if (search) {
            const searchOr: Prisma.CustomerProfileWhereInput[] = [
                { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { organizationName: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { primaryEmail: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { city: { contains: search, mode: Prisma.QueryMode.insensitive } }
            ];
            where.OR = searchOr;
            baseWhere.OR = searchOr;
        }
        const typeWhere = buildCustomerTypeWhere(type);
        if (typeWhere) {
            Object.assign(where, typeWhere);
        }
        if (state) {
            where.state = { contains: state, mode: 'insensitive' };
            baseWhere.state = { contains: state, mode: 'insensitive' };
        }
        if (country) {
            where.country = { contains: country, mode: 'insensitive' };
            baseWhere.country = { contains: country, mode: 'insensitive' };
        }

        // Executive Restriction: Only see assigned customers (primary or shared)
        if (user.role === 'EXECUTIVE') {
            where.OR = [
                ...(where.OR || []),
                { assignedToUserId: user.id },
                { assignedExecutives: { some: { id: user.id } } }
            ];
            baseWhere.OR = [
                ...(baseWhere.OR || []),
                { assignedToUserId: user.id },
                { assignedExecutives: { some: { id: user.id } } }
            ];
        }

        // 3. Fetch
        const [customers, total, typeCounts] = await Promise.all([
            prisma.customerProfile.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    user: {
                        select: {
                            email: true,
                            role: true,
                            lastLogin: true,
                            isActive: true
                        }
                    },
                    assignedTo: { // Include assigned staff info
                        select: {
                            email: true,
                            // id: true // id is implicitly available
                        }
                    },
                    institution: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            type: true
                        }
                    },
                    assignments: {
                        where: { isActive: true },
                        include: {
                            employee: {
                                select: {
                                    id: true,
                                    email: true,
                                    role: true
                                }
                            }
                        }
                    },
                    _count: {
                        select: { subscriptions: true }
                    }
                }
            }),
            prisma.customerProfile.count({ where }),
            includeTypeCounts
                ? Promise.all([
                    prisma.customerProfile.count({ where: baseWhere }),
                    prisma.customerProfile.count({ where: { ...baseWhere, ...buildCustomerTypeWhere('INDIVIDUAL') } }),
                    prisma.customerProfile.count({ where: { ...baseWhere, ...buildCustomerTypeWhere('INSTITUTION') } }),
                    prisma.customerProfile.count({ where: { ...baseWhere, ...buildCustomerTypeWhere('AGENCY') } }),
                ])
                : Promise.resolve(null)
        ]);

        return NextResponse.json({
            data: customers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            ...(includeTypeCounts && typeCounts
                ? {
                    typeCounts: {
                        all: typeCounts[0],
                        individual: typeCounts[1],
                        institution: typeCounts[2],
                        agency: typeCounts[3],
                    }
                }
                : {})
        });

    } catch (error) {
        return handleApiError(error, req.nextUrl.pathname);
    }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const body = await req.json();
        const {
            name,
            organizationName,
            customerType,
            primaryEmail,
            primaryPhone,
            
            // Structured Billing
            billingAddress,
            billingCity,
            billingState,
            billingStateCode,
            billingPincode,
            billingCountry,

            // Structured Shipping
            shippingAddress,
            shippingCity,
            shippingState,
            shippingStateCode,
            shippingPincode,
            shippingCountry,
            shippingEnduserName,

            // Legacy support
            city,
            state,
            country,
            pincode,

            gstVatTaxId,
            tags,
            notes,
            secondaryPhone,
            institutionDetails,
            institutionId, 
            institutionType,
            universityId,
            designation, 
            assignedToUserId,
            companyId,
            idempotent: idempotentInBody
        } = body;

        const isIdempotentCreate =
            searchParams.get('idempotent') === 'true' ||
            idempotentInBody === true ||
            idempotentInBody === 'true';

        const resolvedBillingStateCode = deriveStateCodeFromState(
            billingStateCode,
            billingState || state,
        ) || null;
        const resolvedShippingStateCode = deriveStateCodeFromState(
            shippingStateCode || billingStateCode,
            shippingState || billingState || state,
        ) || resolvedBillingStateCode;

        if (!name || !primaryEmail || !customerType) {
            throw new ValidationError('Missing required fields: name, primaryEmail, and customerType are required');
        }

        let actualCustomerType = customerType;
        let actualOrganizationType = null;
        let actualInstitutionType = institutionType;

        if (customerType === 'AGENCY') {
            actualCustomerType = 'ORGANIZATION';
            actualOrganizationType = 'AGENCY';
        } else if (customerType === 'INSTITUTION') {
            actualCustomerType = 'ORGANIZATION';
            actualOrganizationType = 'INSTITUTION';
        } else if (customerType === 'UNIVERSITY') {
            actualCustomerType = 'ORGANIZATION';
            actualOrganizationType = 'UNIVERSITY';
            actualInstitutionType = 'UNIVERSITY';
        } else if (customerType === 'COMPANY') {
            actualCustomerType = 'ORGANIZATION';
            actualOrganizationType = 'COMPANY';
        } else if (customerType === 'ORGANIZATION') {
            actualCustomerType = 'ORGANIZATION';
            actualOrganizationType = institutionType;
        } else {
            actualCustomerType = 'INDIVIDUAL';
        }

        // Determine target company
        const targetCompanyId = companyId || user.companyId;

        const result = await prisma.$transaction(async (tx) => {
            // Check if email already exists
            const existing = await tx.customerProfile.findFirst({
                where: { primaryEmail }
            });
            if (existing) {
                if (isIdempotentCreate) {
                    return { customer: existing, wasCreated: false };
                }
                throw new ConflictError('Customer with this email already exists');
            }

            const user = await tx.user.create({
                data: {
                    email: primaryEmail,
                    password: '$2a$10$p/9p.0vY8Z6Z.p/9p.0vY8Z6Z.p/9p.0vY8Z6Z.p/9p.0v', // Mock hashed password "password123"
                    role: actualOrganizationType === 'AGENCY' ? 'AGENCY' : 'CUSTOMER',
                    companyId: targetCompanyId
                }
            });

            // Auto-create Or Link Organizations (Institution / Agency)
            let finalInstitutionId = institutionId;
            let finalAgencyId = null;

            if (actualCustomerType === 'INSTITUTION' && organizationName) {
                const existingInst = await tx.institution.findFirst({
                    where: { name: organizationName }
                });
                if (existingInst) {
                    finalInstitutionId = existingInst.id;
                } else {
                    const newInst = await tx.institution.create({
                        data: {
                            name: organizationName,
                            code: organizationName.substring(0, 3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000),
                            type: actualInstitutionType === 'UNIVERSITY' ? 'UNIVERSITY' : 'COLLEGE',
                            primaryEmail: primaryEmail,
                            primaryPhone: primaryPhone || '',
                            address: billingAddress || '',
                            city: billingCity || city || '',
                            state: billingState || state || '',
                            country: billingCountry || country || 'India',
                            pincode: billingPincode || pincode || '',
                            companyId: targetCompanyId
                        }
                    });
                    finalInstitutionId = newInst.id;
                }
            } else if (actualOrganizationType === 'AGENCY' && organizationName) {
                const existingAgency = await tx.customerProfile.findFirst({
                    where: { organizationName, customerType: 'ORGANIZATION', organizationType: 'AGENCY' }
                });
                if (existingAgency) {
                    finalAgencyId = existingAgency.id;
                } else {
                    // It will create the CustomerProfile, but wait, if it's new it's created below. Do we need this block? No, the new CustomerProfile is created at line 262 for ALL customers!
                    // Wait if it doesn't exist, we don't need to create it here because it will be created below. But if it exists, what do we do?
                    // We shouldn't create a new one. Wait, if it exists, it means we don't need a new CustomerProfile?
                    // Let's just create an empty AgencyDetails record for the new CustomerProfile *after* it's created if we need one!
                    // Actually, let's keep it simple: the requirement was to link "Agency" if provided. But the customer being created IS the agency!
                    // So we don't create it twice. Let's just remove the agency creation block here, we just create the AgencyDetails below.
                }
            }

            const customer = await tx.customerProfile.create({
                data: {
                    userId: user.id,
                    assignedToUserId: assignedToUserId || null, // Keep primary for compatibility
                    assignedExecutives: assignedToUserId ? {
                        connect: { id: assignedToUserId }
                    } : undefined,
                    companyId: targetCompanyId,
                    name,
                    organizationName,
                    customerType: actualCustomerType,
                    organizationType: actualOrganizationType,
                    primaryEmail,
                    primaryPhone: primaryPhone || '',
                    
                    // Structured Address Fields
                    billingAddress,
                    billingCity,
                    billingState,
                    billingStateCode: resolvedBillingStateCode,
                    billingPincode,
                    billingCountry: billingCountry || country || 'India',

                    shippingAddress: shippingAddress || billingAddress,
                    shippingCity: shippingCity || billingCity || city,
                    shippingState: shippingState || billingState || state,
                    shippingStateCode: resolvedShippingStateCode,
                    shippingPincode: shippingPincode || billingPincode || pincode,
                    shippingCountry: shippingCountry || billingCountry || country || 'India',
                    shippingEnduserName: shippingEnduserName || null,

                    // Legacy 
                    city: city || billingCity,
                    state: state || billingState,
                    country: country || billingCountry || 'India',
                    pincode: pincode || billingPincode,

                    gstVatTaxId,
                    tags,
                    notes,
                    secondaryPhone,
                    institutionId: finalInstitutionId || null,
                    agencyId: finalAgencyId || null,
                    designation: designation || null,
                    leadStatus: null,
                } as any
            });



            if ((actualOrganizationType === 'INSTITUTION' || actualOrganizationType === 'UNIVERSITY') && institutionDetails) {
                await tx.institutionDetails.create({
                    data: {
                        customerProfileId: customer.id,
                        category: institutionDetails.category || 'Other',
                        department: institutionDetails.department,
                        libraryContact: institutionDetails.libraryContact,
                        ipRange: institutionDetails.ipRange,
                        numberOfUsers: institutionDetails.numberOfUsers ? parseInt(institutionDetails.numberOfUsers) : null,
                        numberOfSeats: institutionDetails.numberOfSeats ? parseInt(institutionDetails.numberOfSeats) : null
                    }
                });
            }

            if (actualOrganizationType === 'AGENCY') {
                await (tx.agencyDetails as any).create({
                    data: {
                        customerProfileId: customer.id,
                        territory: body.territory || body.region || null,
                        region: body.region || null,
                        primaryContact: body.primaryContact || name,
                        discountRate: body.discountOffered ? parseFloat(body.discountOffered) : (body.discountRate ? parseFloat(body.discountRate) : 0),
                        discountTier: body.discountTier || 'GOLD'
                    }
                });
            }

            // Sync with Institution if it exists and has universityId
            if (finalInstitutionId && universityId) {
                await (tx.institution as any).update({
                    where: { id: finalInstitutionId },
                    data: { universityId: universityId }
                });
            }

            await tx.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'create',
                    entity: 'customer_profile',
                    entityId: customer.id,
                    changes: JSON.stringify(body)
                }
            });

            return { customer, wasCreated: true };
        });

        logger.info('Customer create handled', {
            customerId: result.customer.id,
            createdBy: user.id,
            wasCreated: result.wasCreated
        });

        return NextResponse.json(result.customer, { status: result.wasCreated ? 201 : 200 });

    } catch (error) {
        return handleApiError(error, req.nextUrl.pathname);
    }
    }
);
