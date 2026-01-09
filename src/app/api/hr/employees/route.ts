import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createEmployeeSchema, updateEmployeeSchema } from '@/lib/validators/hr';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'], // Added TEAM_LEADER
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId && user.role !== 'SUPER_ADMIN') {
                return createErrorResponse('Company association required', 403);
            }

            const where: any = {};

            // Contextual Filtering
            if (user.companyId) {
                where.user = { companyId: user.companyId };
            }

            // Role-based restrictions: Manager & Team Leader see full hierarchy
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                where.user = {
                    ...where.user,
                    id: { in: subIds }
                };
            }

            const employees = await prisma.employeeProfile.findMany({
                where: where,
                include: {
                    user: {
                        select: {
                            email: true,
                            name: true,
                            role: true,
                            isActive: true
                        }
                    },
                    workReports: {
                        orderBy: { date: 'desc' },
                        take: 10
                    },
                    _count: {
                        select: {
                            attendance: true,
                            workReports: true
                        }
                    },
                    designatRef: {
                        select: {
                            name: true,
                            level: true,
                            code: true
                        }
                    }
                }
            });

            return NextResponse.json(employees);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { id, ...data } = body;

            if (!id) return createErrorResponse('Employee ID is required', 400);

            // Log incoming data for debugging
            console.log('📝 Update Employee Request:', { id, dataKeys: Object.keys(data) });

            // Validate payload
            const result = updateEmployeeSchema.safeParse(data);
            if (!result.success) {
                console.error('❌ Validation Error:', JSON.stringify(result.error.format(), null, 2));
                console.error('📦 Received Data:', JSON.stringify(data, null, 2));
                return createErrorResponse(result.error);
            }
            const validUpdates = result.data;

            // 1. Handle User-level updates (Role, Active Status, Name)
            if (validUpdates.role || validUpdates.isActive !== undefined || validUpdates.name) {
                const emp = await prisma.employeeProfile.findUnique({ where: { id }, select: { userId: true } });
                if (emp) {
                    await prisma.user.update({
                        where: { id: emp.userId },
                        data: {
                            ...(validUpdates.role && { role: validUpdates.role }),
                            ...(validUpdates.isActive !== undefined && { isActive: validUpdates.isActive }),
                            ...(validUpdates.name && { name: validUpdates.name })
                        }
                    });
                }
            }

            // 2. Handle Salary History
            const currentProfile = await prisma.employeeProfile.findUnique({ where: { id } });
            if (currentProfile && typeof validUpdates.baseSalary === 'number' && validUpdates.baseSalary !== currentProfile.baseSalary) {
                const oldSalary = currentProfile.baseSalary || 0;
                const newSalary = validUpdates.baseSalary;
                const increment = newSalary - oldSalary;
                const percentage = oldSalary > 0 ? (increment / oldSalary) * 100 : 0;
                await prisma.salaryIncrementRecord.create({
                    data: {
                        employeeProfileId: id,
                        oldSalary,
                        newSalary,
                        incrementAmount: increment,
                        percentage,
                        reason: 'Performance Review / Adjustment',
                        approvedByUserId: user.id
                    }
                });
            }

            // 3. Update Employee Profile
            const { role, id: _unusedId, isActive, name, designationId, email, password, ...profileData } = validUpdates;

            // Handle designation relation separately if provided
            const updateData: any = { ...profileData };

            if (designationId !== undefined) {
                if (designationId === null) {
                    updateData.designatRef = { disconnect: true };
                } else {
                    updateData.designatRef = { connect: { id: designationId } };
                }
            }

            // Safety: Remove any nulls that shouldn't be null (Prisma Float/Int with default)
            const nonNullableNumbers = [
                'totalExperienceYears', 'totalExperienceMonths',
                'relevantExperienceYears', 'relevantExperienceMonths',
                'lastIncrementPercentage', 'manualLeaveAdjustment', 'leaveBalance'
            ];
            nonNullableNumbers.forEach(key => {
                if (updateData[key] === null) {
                    delete updateData[key];
                }
            });

            const updated = await prisma.employeeProfile.update({
                where: { id },
                data: updateData
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            // Validate payload
            const result = createEmployeeSchema.safeParse(body);
            if (!result.success) {
                return createErrorResponse(result.error);
            }
            const { email, name, password, role, ...profileData } = result.data;

            // Check if user already exists
            let targetUser = await prisma.user.findUnique({ where: { email } });

            if (targetUser) {
                // Update existing user's company and role if needed
                targetUser = await prisma.user.update({
                    where: { email },
                    data: {
                        companyId: user.companyId,
                        role: role || targetUser.role,
                        name: name || targetUser.name
                    }
                });
            } else {
                // Create user first
                targetUser = await prisma.user.create({
                    data: {
                        email,
                        name,
                        password: password,
                        role: role,
                        companyId: user.companyId
                    }
                });
            }

            // Check if profile already exists for this user
            const existingProfile = await prisma.employeeProfile.findUnique({
                where: { userId: targetUser.id }
            });

            let profile;
            if (existingProfile) {
                // Update existing profile
                profile = await prisma.employeeProfile.update({
                    where: { id: existingProfile.id },
                    data: profileData
                });
            } else {
                // Create new profile
                profile = await prisma.employeeProfile.create({
                    data: {
                        userId: targetUser.id,
                        ...profileData
                    }
                });
            }

            return NextResponse.json({ user: targetUser, profile });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');

            if (!id) return createErrorResponse('ID required', 400);

            const emp = await prisma.employeeProfile.findUnique({ where: { id }, select: { userId: true } });
            if (emp) {
                await prisma.user.update({
                    where: { id: emp.userId },
                    data: { isActive: false }
                });
            } else {
                return createErrorResponse("Employee not found", 404);
            }

            return NextResponse.json({ message: 'Employee deactivated successfully' });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
