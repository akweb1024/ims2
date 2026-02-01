import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// GET: List all agencies
export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const limit = parseInt(searchParams.get('limit') || '50');

        const agencies = await prisma.customerProfile.findMany({
            where: {
                customerType: 'AGENCY',
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { primaryEmail: { contains: search, mode: 'insensitive' } },
                    { organizationName: { contains: search, mode: 'insensitive' } }
                ]
            },
            include: {
                agencyDetails: true,
                _count: {
                    select: { subscriptions: true }
                }
            },
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(agencies);
    } catch (error: any) {
        console.error('Error fetching agencies:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create a new agency
export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            name,
            organizationName,
            primaryEmail,
            primaryPhone,
            discountRate,
            commissionTerms,
            territory
        } = body;

        // Validation
        if (!name || !primaryEmail || !primaryPhone) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check for existing email
        const existing = await prisma.user.findUnique({ where: { email: primaryEmail } });
        if (existing) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }

        // Create Transaction
        const agency = await prisma.$transaction(async (tx) => {
            // 1. Create User
            const newUser = await tx.user.create({
                data: {
                    name,
                    email: primaryEmail,
                    password: '$2b$10$EpRnTzVlqHNP0zQx.Z.6.eB.q.q.q.q.q.q.q.q.q.q.q.q', // Default dummy password, in a real app would be generated/emailed
                    role: 'CUSTOMER', // Agencies login as customers conceptually, or separate role? Using CUSTOMER for now as per CustomerProfile relation
                }
            });

            // 2. Create Customer Profile with Agency Details
            const profile = await tx.customerProfile.create({
                data: {
                    userId: newUser.id,
                    customerType: 'AGENCY',
                    name,
                    organizationName,
                    primaryEmail,
                    primaryPhone,
                    agencyDetails: {
                        create: {
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

            return profile;
        });

        return NextResponse.json(agency);

    } catch (error: any) {
        console.error('Error creating agency:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
