import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { applicationId, role, designation, offerLetterUrl, contractUrl } = await req.json();

        const application = await prisma.jobApplication.findUnique({
            where: { id: applicationId },
            include: { jobPosting: true }
        });

        if (!application || application.status !== 'SELECTED') {
            return NextResponse.json({ error: 'Application not eligible for onboarding' }, { status: 400 });
        }

        // Create actual User and EmployeeProfile
        const tempPassword = await bcrypt.hash('welcome123', 12);

        await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email: application.applicantEmail,
                    password: tempPassword,
                    role: role || 'SALES_EXECUTIVE',
                    companyId: application.jobPosting.companyId,
                    isActive: true,
                    employeeProfile: {
                        create: {
                            designation: designation || application.jobPosting.title,
                            dateOfJoining: new Date(),
                            offerLetterUrl,
                            contractUrl
                        }
                    }
                }
            });

            await tx.jobApplication.update({
                where: { id: applicationId },
                data: {
                    status: 'ONBOARDED',
                    offerLetterUrl,
                    contractUrl
                }
            });

            return newUser;
        });

        return NextResponse.json({ success: true, message: `Applicant onboarded as ${role || 'Employee'}` });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
