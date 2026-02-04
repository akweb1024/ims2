import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

// GET /api/staff-management/employees - List employees
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get('companyId');
            const departmentId = searchParams.get('departmentId');
            const id = searchParams.get('id');
            const status = searchParams.get('status');

            const where: any = {
                employeeProfile: {
                    isNot: null
                }
            };

            // Filter by company
            const showAll = searchParams.get('all') === 'true';

            if (companyId && companyId !== 'all') {
                where.companyId = companyId;
            } else if (user.companyId && !showAll) {
                // Only restrict by user's company if NOT showAll
                where.companyId = user.companyId;
            } else if (!user.companyId && !showAll && user.role !== 'SUPER_ADMIN') {
                // If no company in session and not super admin and not showAll, return nothing
                return NextResponse.json([]);
            }
            // If showAll=true or (user.companyId is null and user is SUPER_ADMIN), where.companyId is omitted (Global View)

            // Filter by department
            if (departmentId && departmentId !== 'all') {
                where.departmentId = departmentId;
            }

            // Filter by specific employee
            if (id && id !== 'all') {
                where.id = id;
            }

            // Filter by status
            if (status && status !== 'all') {
                where.isActive = status === 'ACTIVE';
            }

            const search = searchParams.get('search');
            const searchType = searchParams.get('searchType') || 'all';

            if (search) {
                if (searchType === 'all') {
                    where.OR = [
                        { name: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                        { employeeProfile: { phoneNumber: { contains: search, mode: 'insensitive' } } },
                        { employeeProfile: { employeeId: { contains: search, mode: 'insensitive' } } }
                    ];
                } else if (searchType === 'name') {
                    where.name = { contains: search, mode: 'insensitive' };
                } else if (searchType === 'email') {
                    where.email = { contains: search, mode: 'insensitive' };
                } else if (searchType === 'phone') {
                    where.employeeProfile = { ...where.employeeProfile, phoneNumber: { contains: search, mode: 'insensitive' } };
                } else if (searchType === 'id') {
                    where.employeeProfile = { ...where.employeeProfile, employeeId: { contains: search, mode: 'insensitive' } };
                }
            }

            const employees = await prisma.user.findMany({
                where,
                include: {
                    department: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    manager: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    company: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    employeeProfile: {
                        include: {
                            designatRef: true,
                            performanceSnapshots: {
                                orderBy: [
                                    { year: 'desc' },
                                    { month: 'desc' }
                                ],
                                take: 1
                            }
                        }
                    }
                },
                orderBy: {
                    name: 'asc'
                }
            });

            // Transform data to match component expectations
            const transformedEmployees = employees.map((emp: any) => {
                const profile = emp.employeeProfile;

                // Calculate total experience string
                let experienceStr = '';
                if (profile) {
                    const years = (profile.totalExperienceYears || 0) + (profile.relevantExperienceYears || 0);
                    const months = (profile.totalExperienceMonths || 0) + (profile.relevantExperienceMonths || 0);
                    const totalYears = years + Math.floor(months / 12);
                    const remainingMonths = months % 12;
                    if (totalYears > 0) experienceStr += `${totalYears} Y `;
                    if (remainingMonths > 0) experienceStr += `${remainingMonths} M`;
                }

                return {
                    id: emp.id,
                    name: emp.name,
                    email: emp.email,
                    phone: profile?.phoneNumber || '',
                    companyId: emp.companyId,
                    companyName: emp.company?.name || '-',
                    departmentId: emp.departmentId,
                    designationId: profile?.designationId,
                    dateOfJoining: profile?.dateOfJoining,
                    status: emp.isActive ? 'ACTIVE' : 'INACTIVE',
                    department: emp.department,
                    manager: emp.manager ? { name: emp.manager.name, id: emp.manager.id } : null,
                    designation: profile?.designatRef ? {
                        title: profile.designatRef.name,
                        ...profile.designatRef
                    } : null,
                    // HR Specific Fields
                    baseSalary: profile?.baseSalary || 0,
                    skills: profile?.skills || [],
                    performanceSnapshots: profile?.performanceSnapshots || [],
                    calculatedTotalExperience: experienceStr.trim(),
                    profilePicture: profile?.profilePicture
                };
            });

            return NextResponse.json(transformedEmployees);
        } catch (error) {
            logger.error('Error fetching employees:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);

// POST /api/staff-management/employees - Create new employee
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, currentUser) => {
        try {
            const body = await req.json();
            const { name, email, phone, companyId, departmentId, designationId, dateOfJoining, status, managerId } = body;

            // Validate required fields
            if (!name || !email) {
                return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
            }

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });

            if (existingUser) {
                return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
            }

            // Create user and employee profile in a transaction
            const newEmployee = await prisma.$transaction(async (tx) => {
                // Create user
                const user = await tx.user.create({
                    data: {
                        name,
                        email,
                        password: 'temp123', // Temporary password
                        role: 'EMPLOYEE' as any,
                        companyId: companyId || currentUser.companyId,
                        departmentId: departmentId || null,
                        managerId: managerId || null,
                        isActive: status === 'ACTIVE',
                        allowedModules: ['CORE']
                    }
                });

                // Create employee profile
                const profile = await tx.employeeProfile.create({
                    data: {
                        userId: user.id,
                        phoneNumber: phone || null,
                        designationId: designationId || null,
                        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
                        employeeId: `EMP${Date.now()}` // Generate employee ID
                    }
                });

                return { user, profile };
            });

            return NextResponse.json({
                id: newEmployee.user.id,
                name: newEmployee.user.name,
                email: newEmployee.user.email,
                message: 'Employee created successfully'
            }, { status: 201 });
        } catch (error) {
            logger.error('Error creating employee:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
