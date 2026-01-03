import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (!user.companyId && user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Company association required' }, { status: 403 });
        }

        const employees = await prisma.employeeProfile.findMany({
            where: user.role === 'SUPER_ADMIN' ? {} : (user.role === 'MANAGER' ? {
                user: { managerId: user.id, companyId: user.companyId }
            } : {
                user: { companyId: user.companyId }
            }),
            include: {
                user: {
                    select: {
                        email: true,
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
                }
            }
        });

        return NextResponse.json(employees);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { id, ...data } = body;

        // Ensure date fields are actual Dates
        if (data.dateOfJoining) data.dateOfJoining = new Date(data.dateOfJoining);
        if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
        if (data.baseSalary) data.baseSalary = parseFloat(data.baseSalary);

        // Update User Role if passed
        if (data.role || data.isActive !== undefined) {
            const emp = await prisma.employeeProfile.findUnique({ where: { id }, select: { userId: true } });
            if (emp) {
                await prisma.user.update({
                    where: { id: emp.userId },
                    data: {
                        ...(data.role && { role: data.role }),
                        ...(data.isActive !== undefined && { isActive: data.isActive })
                    }
                });
            }
        }

        const updated = await prisma.employeeProfile.update({
            where: { id },
            data: {
                designation: data.designation,
                baseSalary: data.baseSalary,
                bankName: data.bankName,
                accountNumber: data.accountNumber,
                panNumber: data.panNumber,
                offerLetterUrl: data.offerLetterUrl,
                contractUrl: data.contractUrl
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { email, password, role, ...profileData } = await req.json();

        // Robust data conversion
        const cleanProfileData: any = {};
        if (profileData.designation) cleanProfileData.designation = profileData.designation;
        if (profileData.bankName) cleanProfileData.bankName = profileData.bankName;
        if (profileData.accountNumber) cleanProfileData.accountNumber = profileData.accountNumber;
        if (profileData.panNumber) cleanProfileData.panNumber = profileData.panNumber;
        if (profileData.offerLetterUrl) cleanProfileData.offerLetterUrl = profileData.offerLetterUrl;
        if (profileData.contractUrl) cleanProfileData.contractUrl = profileData.contractUrl;

        if (profileData.baseSalary !== undefined && profileData.baseSalary !== '') {
            const salary = parseFloat(profileData.baseSalary);
            if (!isNaN(salary)) cleanProfileData.baseSalary = salary;
        }

        if (profileData.dateOfJoining) {
            const d = new Date(profileData.dateOfJoining);
            if (!isNaN(d.getTime())) cleanProfileData.dateOfJoining = d;
        }

        if (profileData.dateOfBirth) {
            const d = new Date(profileData.dateOfBirth);
            if (!isNaN(d.getTime())) cleanProfileData.dateOfBirth = d;
        }

        // Check if user already exists
        let targetUser = await prisma.user.findUnique({ where: { email } });

        if (targetUser) {
            // Update existing user's company and role if needed
            targetUser = await prisma.user.update({
                where: { email },
                data: {
                    companyId: user.companyId,
                    role: role || targetUser.role
                }
            });
        } else {
            // Create user first
            targetUser = await prisma.user.create({
                data: {
                    email,
                    password: password || 'Welcome123', // Default password
                    role: role || 'SALES_EXECUTIVE',
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
                data: cleanProfileData
            });
        } else {
            // Create new profile
            profile = await prisma.employeeProfile.create({
                data: {
                    userId: targetUser.id,
                    ...cleanProfileData
                }
            });
        }

        return NextResponse.json({ user: targetUser, profile });
    } catch (error: any) {
        console.error('ONBOARD_ERROR:', error);
        return NextResponse.json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // Deleting an employee is complex (relationships). 
        // Best practice: Soft Delete (set isActive = false). 
        // But for this request, if asking to delete, we'll try to delete or deactivate.
        // Let's implement Soft Delete via this endpoint for safety.

        const emp = await prisma.employeeProfile.findUnique({ where: { id }, select: { userId: true } });
        if (emp) {
            await prisma.user.update({
                where: { id: emp.userId },
                data: { isActive: false }
            });
        }

        return NextResponse.json({ message: 'Employee deactivated successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
