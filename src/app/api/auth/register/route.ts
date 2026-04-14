import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth-legacy';
import { UserRole, CustomerType } from '@/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            email,
            password,
            customerType,
            name,
            organizationName,
            primaryPhone,
            country,
            category,
            territory,
        } = body;

        // Validation
        if (!email || !password || !customerType || !name || !primaryPhone) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'Email already registered' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Determine hierarchical classification
        let actualCustomerType = customerType;
        let actualOrganizationType = null;

        if (customerType === 'AGENCY') {
            actualCustomerType = 'ORGANIZATION';
            actualOrganizationType = 'AGENCY';
        } else if (customerType === 'INSTITUTION') {
            actualCustomerType = 'ORGANIZATION';
            actualOrganizationType = 'INSTITUTION';
        } else if (customerType === 'UNIVERSITY') {
            actualCustomerType = 'ORGANIZATION';
            actualOrganizationType = 'UNIVERSITY';
        } else if (customerType === 'COMPANY') {
            actualCustomerType = 'ORGANIZATION';
            actualOrganizationType = 'COMPANY';
        } else if (customerType === 'ORGANIZATION') {
            actualCustomerType = 'ORGANIZATION';
            actualOrganizationType = category;
        } else if (customerType === 'INDIVIDUAL') {
            actualCustomerType = 'INDIVIDUAL';
        }

        // Determine user role based on customer type
        let userRole: UserRole = UserRole.CUSTOMER;
        if (actualOrganizationType === 'AGENCY') {
            userRole = UserRole.AGENCY;
        }

        // Create user with customer profile in a transaction
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: userRole,
                customerProfile: {
                    create: {
                        customerType: actualCustomerType as CustomerType,
                        organizationType: actualOrganizationType as any,
                        name,
                        organizationName: organizationName || null,
                        primaryEmail: email,
                        primaryPhone,
                        country: country || null,
                        region: territory || null,
                        ...(actualOrganizationType === 'INSTITUTION' || actualOrganizationType === 'UNIVERSITY'
                            ? {
                                institutionDetails: {
                                    create: {
                                        category: category || 'GENERAL',
                                    },
                                },
                            }
                            : {}),
                        ...(actualOrganizationType === 'AGENCY'
                            ? {
                                agencyDetails: {
                                    create: {
                                        territory,
                                    },
                                },
                            }
                            : {}),
                    },
                },
            },
            include: {
                customerProfile: {
                    include: {
                        institutionDetails: true,
                        agencyDetails: true,
                    },
                },
            },
        });

        // Generate JWT token
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
        });

        // Log audit
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'create',
                entity: 'user',
                entityId: user.id,
                changes: {
                    email: user.email,
                    role: user.role,
                    customerType,
                },
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: 'Registration successful',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    customerProfile: user.customerProfile,
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'An error occurred during registration' },
            { status: 500 }
        );
    }
}
