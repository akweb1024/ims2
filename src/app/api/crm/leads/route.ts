
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '10');
        const page = parseInt(searchParams.get('page') || '1');
        const skip = (page - 1) * limit;

        const isGlobal = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role);

        const where: any = {
            companyId: user.companyId,
            customerType: 'LEAD',
            ...(!isGlobal && { assignedToUserId: user.id }),
            ...(status && { leadStatus: status }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { primaryEmail: { contains: search, mode: 'insensitive' } },
                    { organizationName: { contains: search, mode: 'insensitive' } }
                ]
            })
        };

        const [leads, total] = await Promise.all([
            prisma.customerProfile.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    assignedTo: {
                        select: { id: true, name: true, email: true }
                    },
                    _count: {
                        select: { deals: true }
                    }
                }
            }),
            prisma.customerProfile.count({ where })
        ]);

        return NextResponse.json({
            data: leads,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Failed to fetch leads:', error);
        return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Basic validation
        if (!body.name || !body.primaryEmail) {
            return NextResponse.json({ error: 'Name and Email are required' }, { status: 400 });
        }

        // Create user account for the lead (optional, but standard in this system)
        // For now, we'll just create the profile linked to a placeholder or new user if needed
        // BUT, given the schema, CustomerProfile MUST have a userId.
        // So we need to create a User record first.

        // Check if user exists
        let leadUser = await prisma.user.findUnique({
            where: { email: body.primaryEmail }
        });

        if (!leadUser) {
            // Create a shadow user for the lead
            leadUser = await prisma.user.create({
                data: {
                    email: body.primaryEmail,
                    name: body.name,
                    password: 'TEMP_PASSWORD_' + Date.now(), // Placeholder, they can't login yet
                    role: 'CUSTOMER',
                    companyId: user.companyId,
                    isActive: true
                }
            });
        }

        const lead = await prisma.customerProfile.create({
            data: {
                userId: leadUser.id,
                companyId: user.companyId,
                customerType: 'LEAD',
                name: body.name,
                primaryEmail: body.primaryEmail,
                primaryPhone: body.primaryPhone || '',
                organizationName: body.organizationName,
                leadStatus: body.status || 'NEW',
                leadScore: body.score || 0,
                source: body.source || 'DIRECT',
                assignedToUserId: body.assignedToUserId || user.id, // Default to creator
                notes: body.notes
            }
        });

        return NextResponse.json(lead);

    } catch (error) {
        console.error('Failed to create lead:', error);
        return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
    }
}
