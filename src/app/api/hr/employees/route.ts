import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createEmployeeSchema, updateEmployeeSchema } from '@/lib/validators/hr';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR'], // Added HR Roles
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId && user.role !== 'SUPER_ADMIN') {
                return createErrorResponse('Company association required', 403);
            }

            const where: any = {};

            // Contextual Filtering
            // Contextual Filtering
            const url = new URL(req.url);
            const showAll = url.searchParams.get('all') === 'true';

            // Only restrict by company if NOT showing all (and user has company)
            // Super Admin always ignores companyId unless specific filter added. 
            // Here we allow ADMIN to see all if requested.
            if (user.companyId && !showAll) {
                where.user = { companyId: user.companyId };
            } else if (user.companyId && showAll) {
                // If showing all, ensure user has permission to see outside company (e.g. SUPER_ADMIN or specific ADMIN privilege)
                // For now, allow regular ADMIN to see all as per request
                if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
                    where.user = { companyId: user.companyId }; // Fallback for non-admins
                }
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
                            id: true,
                            email: true,
                            name: true,
                            role: true,
                            isActive: true,
                            companyId: true,
                            managerId: true,
                            manager: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            },
                            company: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            },
                            department: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    },
                    workReports: {
                        orderBy: { date: 'desc' },
                        take: 10
                    },
                    performanceSnapshots: {
                        orderBy: { calculatedAt: 'desc' },
                        take: 1
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
                    },
                    companyDesignations: true,
                    salaryStructure: true
                }
            });

            const mappedEmployees = employees.map(emp => {
                let calculatedTotalExperience = "0 years";
                if (emp.dateOfJoining) {
                    const today = new Date();
                    const joining = new Date(emp.dateOfJoining);

                    // Tenure in months
                    let tenureMonths = (today.getFullYear() - joining.getFullYear()) * 12;
                    tenureMonths -= joining.getMonth();
                    tenureMonths += today.getMonth();
                    if (today.getDate() < joining.getDate()) {
                        tenureMonths--;
                    }
                    if (tenureMonths < 0) tenureMonths = 0;

                    // Add previous experience
                    const prevYears = emp.totalExperienceYears || 0;
                    const prevMonths = emp.totalExperienceMonths || 0;

                    const totalMonths = (prevYears * 12) + prevMonths + tenureMonths;
                    const years = Math.floor(totalMonths / 12);
                    const months = totalMonths % 12;

                    calculatedTotalExperience = `${years} years${months > 0 ? ` ${months} months` : ''}`;
                } else {
                    // Fallback to manual fields if no joining date
                    const years = emp.totalExperienceYears || 0;
                    const months = emp.totalExperienceMonths || 0;
                    calculatedTotalExperience = `${years} years${months > 0 ? ` ${months} months` : ''}`;
                }

                return {
                    ...emp,
                    calculatedTotalExperience
                };
            });

            return NextResponse.json(mappedEmployees);
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

            // 1. Handle User-level updates (Role, Active Status, Name, Manager, Company, Modules)
            if (validUpdates.role || validUpdates.isActive !== undefined || validUpdates.name || validUpdates.managerId !== undefined || validUpdates.companyId !== undefined || validUpdates.companyIds !== undefined || validUpdates.allowedModules !== undefined || validUpdates.departmentId !== undefined) {
                const emp = await prisma.employeeProfile.findUnique({ where: { id }, select: { userId: true } });
                if (!emp) return createErrorResponse('Employee not found', 404);

                // Access Control: Manager can only update their own team
                if (user.role === 'MANAGER') {
                    const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                    if (!subIds.includes(emp.userId)) {
                        return createErrorResponse('Forbidden: Not in your team', 403);
                    }
                }

                if (emp) {
                    await prisma.user.update({
                        where: { id: emp.userId },
                        data: {
                            ...(validUpdates.role && { role: validUpdates.role as any }),
                            ...(validUpdates.isActive !== undefined && { isActive: validUpdates.isActive }),
                            ...(validUpdates.name && { name: validUpdates.name }),
                            ...(validUpdates.managerId !== undefined && { managerId: validUpdates.managerId as any }),
                            ...(validUpdates.companyId !== undefined && { companyId: validUpdates.companyId as any }),
                            ...(validUpdates.departmentId !== undefined && { departmentId: validUpdates.departmentId as any }),
                            ...(validUpdates.companyIds !== undefined && {
                                companies: {
                                    set: validUpdates.companyIds.map(id => ({ id }))
                                }
                            }),
                            ...(validUpdates.allowedModules !== undefined && { allowedModules: validUpdates.allowedModules })
                        } as any
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

            // 3. Update Employee Profile - Strip relations and metadata
            const {
                role, id: _unusedId, isActive, name, designationId, email, password, managerId, companyId, companyIds, allowedModules, departmentId,
                userId, createdAt, updatedAt, user: _userRel, incrementHistory, hrComments, workReports, attendance,
                documents, designatRef, leaveRequests, onboardingProgress, leaveLedgers, digitalDocuments,
                goals, incentives, kpis, performance, performanceInsights, salaryAdvances, salarySlips,
                salaryStructure, shiftRosters, taxDeclarations, workPlans, companyDesignations,
                ...rest
            } = validUpdates as any;

            // Profile fields filtering - double check no relations are left
            const profileData = { ...rest };
            const metadataFields = [
                'user', 'manager', 'designatRef', 'incrementHistory', 'hrComments', 'workReports',
                'attendance', 'documents', 'leaveRequests', 'onboardingProgress', 'leaveLedgers',
                'digitalDocuments', 'goals', 'incentives', 'kpis', 'performance', 'performanceInsights',
                'salaryAdvances', 'salarySlips', 'salaryStructure', 'shiftRosters', 'taxDeclarations', 'workPlans',
                'companyDesignations'
            ];
            metadataFields.forEach(f => delete (profileData as any)[f]);

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
                'lastIncrementPercentage', 'manualLeaveAdjustment', 'leaveBalance', 'currentLeaveBalance'
            ];
            nonNullableNumbers.forEach(key => {
                if (updateData[key] === null) {
                    delete updateData[key];
                }
            });

            // Keep balances in sync if one is provided
            if (updateData.leaveBalance !== undefined && updateData.currentLeaveBalance === undefined) {
                updateData.currentLeaveBalance = updateData.leaveBalance;
            } else if (updateData.currentLeaveBalance !== undefined && updateData.leaveBalance === undefined) {
                updateData.leaveBalance = updateData.currentLeaveBalance;
            }

            const updated = await prisma.employeeProfile.update({
                where: { id },
                data: updateData
            });

            // 4. Sync SalaryStructure if salary fields were updated
            if (validUpdates.baseSalary || validUpdates.salaryFixed || validUpdates.salaryVariable || validUpdates.salaryIncentive) {
                const newSalary = validUpdates.baseSalary || updated.baseSalary || 0;
                const basicSalary = newSalary * 0.4; // 40% basic
                const hra = newSalary * 0.3; // 30% HRA
                const specialAllowance = newSalary * 0.2; // 20% special allowance
                const conveyance = newSalary * 0.05; // 5% conveyance
                const medical = newSalary * 0.05; // 5% medical

                const grossSalary = basicSalary + hra + specialAllowance + conveyance + medical;

                // Employee deductions
                const pfEmployee = basicSalary * 0.12;
                const esicEmployee = grossSalary <= 21000 ? grossSalary * 0.0075 : 0;
                const totalDeductions = pfEmployee + esicEmployee;

                // Employer contributions
                const pfEmployer = basicSalary * 0.12;
                const esicEmployer = grossSalary <= 21000 ? grossSalary * 0.0325 : 0;
                const gratuity = basicSalary * 0.0481;

                const netSalary = grossSalary - totalDeductions;
                const ctc = grossSalary + pfEmployer + esicEmployer + gratuity;

                await prisma.salaryStructure.upsert({
                    where: { employeeId: id },
                    update: {
                        basicSalary,
                        hra,
                        conveyance,
                        medical,
                        specialAllowance,
                        grossSalary,
                        pfEmployee,
                        esicEmployee,
                        totalDeductions,
                        pfEmployer,
                        esicEmployer,
                        gratuity,
                        netSalary,
                        ctc,
                        effectiveFrom: new Date()
                    },
                    create: {
                        employeeId: id,
                        basicSalary,
                        hra,
                        conveyance,
                        medical,
                        specialAllowance,
                        grossSalary,
                        pfEmployee,
                        esicEmployee,
                        totalDeductions,
                        pfEmployer,
                        esicEmployer,
                        gratuity,
                        netSalary,
                        ctc
                    }
                });
            }

            // 5. Update Company Designations if provided
            if (companyDesignations && Array.isArray(companyDesignations)) {
                for (const cd of companyDesignations) {
                    if (cd.companyId && cd.designation) {
                        try {
                            await prisma.employeeCompanyDesignation.upsert({
                                where: {
                                    employeeId_companyId: {
                                        employeeId: id,
                                        companyId: cd.companyId
                                    }
                                },
                                update: {
                                    designation: cd.designation,
                                    designationId: cd.designationId || null,
                                    isPrimary: cd.isPrimary || false
                                },
                                create: {
                                    employeeId: id,
                                    companyId: cd.companyId,
                                    designation: cd.designation,
                                    designationId: cd.designationId || null,
                                    isPrimary: cd.isPrimary || false
                                }
                            });
                        } catch (err) {
                            console.error(`Failed to update designation for company ${cd.companyId}`, err);
                        }
                    }
                }
            }

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
            const {
                email, name, password, role, companyId, companyIds, allowedModules, departmentId, companyDesignations,
                ...rest
            } = result.data as any;

            // Fetch company data to get employeeIdPrefix
            const targetCompanyId = companyId || user.companyId;
            let employeeIdPrefix = '';

            if (targetCompanyId) {
                const company = await prisma.company.findUnique({
                    where: { id: targetCompanyId },
                    select: { employeeIdPrefix: true }
                });
                employeeIdPrefix = company?.employeeIdPrefix || '';
            }

            // Generate default employeeId if not provided
            if (!rest.employeeId) {
                const part = email.split('@')[0];
                const initials = part
                    .split(/[._-]/)
                    .map((segment: string) => segment[0]?.toUpperCase() || '')
                    .join('');
                const prefix = initials || 'EMP';
                const suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random number

                // Include company prefix if available
                rest.employeeId = employeeIdPrefix
                    ? `${employeeIdPrefix}-${prefix}${suffix}`
                    : `${prefix}${suffix}`;
            }

            // Set initial leave balance if provided, otherwise default to 0
            if (rest.initialLeaveBalance !== undefined) {
                const bal = parseFloat(rest.initialLeaveBalance) || 0;
                rest.currentLeaveBalance = bal;
                rest.leaveBalance = bal;
            } else {
                // Also default both to 0 if not provided explicitly
                rest.currentLeaveBalance = rest.leaveBalance || 0;
                rest.leaveBalance = rest.currentLeaveBalance || 0;
            }

            // Profile fields filtering - ensure no relation/meta fields leak into Prisma
            const profileData = { ...rest };
            const metadataFields = [
                'id', 'userId', 'createdAt', 'updatedAt', 'user', 'manager',
                'incrementHistory', 'hrComments', 'workReports', 'attendance', 'documents', 'designatRef',
                'leaveRequests', 'onboardingProgress', 'leaveLedgers', 'digitalDocuments',
                'goals', 'incentives', 'kpis', 'performance', 'performanceInsights'
            ];
            metadataFields.forEach(f => delete (profileData as any)[f]);

            // Check if user already exists
            let targetUser = await prisma.user.findUnique({ where: { email } });

            if (targetUser) {
                // Update existing user's company and role if needed
                targetUser = await prisma.user.update({
                    where: { email },
                    data: {
                        companyId: companyId || user.companyId,
                        role: (role || targetUser.role) as any,
                        name: name || targetUser.name,
                        departmentId: departmentId || targetUser.departmentId,
                        ...(companyIds && {
                            companies: {
                                set: companyIds.map((id: string) => ({ id }))
                            }
                        }),
                        ...(allowedModules && { allowedModules })
                    } as any
                });
            } else {
                // Create user first
                targetUser = await prisma.user.create({
                    data: {
                        email,
                        name,
                        password: password,
                        role: role as any,
                        companyId: companyId || user.companyId,
                        departmentId: departmentId,
                        allowedModules: allowedModules || ["CORE"],
                        companies: {
                            connect: (companyIds || []).map((id: string) => ({ id }))
                        }
                    } as any
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

            // Save Company Designations for new employee
            if (companyDesignations && Array.isArray(companyDesignations) && profile) {
                for (const cd of companyDesignations) {
                    if (cd.companyId && cd.designation) {
                        try {
                            await prisma.employeeCompanyDesignation.upsert({
                                where: {
                                    employeeId_companyId: {
                                        employeeId: profile.id,
                                        companyId: cd.companyId
                                    }
                                },
                                update: {
                                    designation: cd.designation,
                                    designationId: cd.designationId || null,
                                    isPrimary: cd.isPrimary || false
                                },
                                create: {
                                    employeeId: profile.id,
                                    companyId: cd.companyId,
                                    designation: cd.designation,
                                    designationId: cd.designationId || null,
                                    isPrimary: cd.isPrimary || false
                                }
                            });
                        } catch (err) {
                            console.error(`Failed to create designation for company ${cd.companyId}`, err);
                        }
                    }
                }
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
