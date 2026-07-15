import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { companyScopeWhere } from '@/lib/company-scope';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const showAll = searchParams.get('all') === 'true';

        let where: any = { isPublished: true };

        if (showAll && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            where = {};
            Object.assign(where, companyScopeWhere(user));
        } else {
            // `companyId: user?.companyId || undefined` dropped the filter for a
            // null-company user, exposing every company's published courses. Such a
            // user now sees only the courses they instruct.
            where = {
                OR: [
                    ...(user.companyId ? [{ isPublished: true, companyId: user.companyId }] : []),
                    { instructorId: user.id }
                ]
            }
        }

        const courses = await prisma.course.findMany({
            where,
            include: {
                _count: {
                    select: { modules: true, enrollments: true }
                },
                mentor: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(courses);

    } catch (error: any) {
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
        const { title, description, price, currency, thumbnailUrl } = body;

        const course = await prisma.course.create({
            data: {
                title,
                description,
                price: parseFloat(price) || 0,
                currency: currency || 'INR',
                thumbnailUrl,
                instructorId: user.id,
                companyId: user.companyId,
                isPublished: false, // Draft by default
                mentorId: body.mentorId,
                mentorReward: parseFloat(body.mentorReward || '0')
            }
        });

        return NextResponse.json(course);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
