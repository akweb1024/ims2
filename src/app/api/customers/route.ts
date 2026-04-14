import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { CustomerType } from '@/types';

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
        const type = searchParams.get('type') as CustomerType | null;
        const state = searchParams.get('state');
        const country = searchParams.get('country');

        const skip = (page - 1) * limit;

        const where: Prisma.CustomerProfileWhereInput = {};
        const userCompanyId = user.companyId;

        if (userCompanyId) {
            where.companyId = userCompanyId;
            where.leadStatus = null; // Exclude leads
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { organizationName: { contains: search, mode: 'insensitive' } },
                { primaryEmail: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (type) {
            where.customerType = type;
        }
        if (state) {
            where.state = { contains: state, mode: 'insensitive' };
        }
        if (country) {
            where.country = { contains: country, mode: 'insensitive' };
        }

        // Executive Restriction: Only see assigned customers (primary or shared)
        if (user.role === 'EXECUTIVE') {
            where.OR = [
                ...(where.OR || []),
                { assignedToUserId: user.id },
                { assignedExecutives: { some: { id: user.id } } }
            ];
        }

        // 3. Fetch
        const [customers, total] = await Promise.all([
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
            prisma.customerProfile.count({ where })
        ]);

        return NextResponse.json({
            data: customers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
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
            companyId 
        } = body;


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
                throw new Error('Customer with this email already exists');
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
                    billingStateCode,
                    billingPincode,
                    billingCountry: billingCountry || country || 'India',

                    shippingAddress: shippingAddress || billingAddress,
                    shippingCity: shippingCity || billingCity || city,
                    shippingState: shippingState || billingState || state,
                    shippingStateCode: shippingStateCode || billingStateCode,
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

            if (actualCustomerType === 'AGENCY') {
                await (tx.agencyDetails as any).create({
                    data: {
                        customerProfileId: customer.id,
                        territory: body.territory || null,
                        region: body.region || null,
                        primaryContact: body.primaryContact || name,
                        discountRate: body.discountRate ? parseFloat(body.discountRate) : 0,
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

            return customer;
        });

        logger.info('Customer created', { customerId: result.id, createdBy: user.id });

        return NextResponse.json(result);

    } catch (error) {
        return handleApiError(error, req.nextUrl.pathname);
    }
    }
);
