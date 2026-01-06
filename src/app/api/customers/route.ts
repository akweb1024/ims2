import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/auth';
import { CustomerType } from '@/types';

export async function GET(req: NextRequest) {
    // Fetch customers with filtering and assignment
    try {
        // 1. Verify Authentication
        const decoded = await getAuthenticatedUser();
        if (!decoded || !decoded.role) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Role Check and Filtering
        const allowedRoles = ['SUPER_ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];
        if (!allowedRoles.includes(decoded.role)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

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
        const userCompanyId = decoded.companyId;

        if (userCompanyId) {
            where.companyId = userCompanyId;
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
        if (decoded.role === 'SALES_EXECUTIVE') {
            where.OR = [
                ...(where.OR || []),
                { assignedToUserId: decoded.id },
                { assignedExecutives: { some: { id: decoded.id } } }
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
        console.error('Customer API Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'MANAGER', 'SALES_EXECUTIVE'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const {
            name,
            organizationName,
            customerType,
            primaryEmail,
            primaryPhone,
            billingAddress,
            city,
            state,
            country,
            pincode,
            gstVatTaxId,
            tags,
            institutionDetails,
            institutionId, // New field
            designation, // New field
            assignedToUserId, // Optional override
            companyId // Optional override for SUPER_ADMIN
        } = body;

        if (!name || !primaryEmail || !customerType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Determine target company
        const targetCompanyId = companyId || decoded.companyId;

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
                    role: customerType === 'AGENCY' ? 'AGENCY' : 'CUSTOMER',
                    companyId: targetCompanyId
                }
            });

            // Determine Assignment
            let initialAssignedTo = assignedToUserId;
            if (!initialAssignedTo && decoded.role === 'SALES_EXECUTIVE') {
                initialAssignedTo = decoded.id; // Auto-assign to self
            }

            const customer = await tx.customerProfile.create({
                data: {
                    userId: user.id,
                    assignedToUserId: initialAssignedTo, // Keep primary for compatibility
                    assignedExecutives: initialAssignedTo ? {
                        connect: { id: initialAssignedTo }
                    } : undefined,
                    companyId: targetCompanyId,
                    name,
                    organizationName,
                    customerType,
                    primaryEmail,
                    primaryPhone: primaryPhone || '',
                    billingAddress,
                    city,
                    state,
                    country,
                    pincode,
                    gstVatTaxId,
                    tags,
                    institutionId: institutionId || null,
                    designation: designation || null,
                }
            });

            if (customerType === 'INSTITUTION' && institutionDetails) {
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

            await tx.auditLog.create({
                data: {
                    userId: decoded.id,
                    action: 'create',
                    entity: 'customer_profile',
                    entityId: customer.id,
                    changes: JSON.stringify(body)
                }
            });

            return customer;
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error('Create Customer Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}
