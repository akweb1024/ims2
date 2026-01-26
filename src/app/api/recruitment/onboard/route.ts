import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import bcrypt from 'bcryptjs';
import { createNotification } from '@/lib/system-notifications';

// Helper to replace placeholders
const hydrateTemplate = (content: string, vars: Record<string, string>) => {
    let output = content;
    Object.keys(vars).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        output = output.replace(regex, vars[key] || '');
    });
    return output;
};

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { applicationId, role, designation, companyId, baseSalary } = await req.json();

            const application = await prisma.jobApplication.findUnique({
                where: { id: applicationId },
                include: { jobPosting: true }
            });

            if (!application || application.status !== 'SELECTED') {
                return createErrorResponse('Application not eligible for onboarding', 400);
            }

            // Determine Company ID
            const targetCompanyId = companyId || application.jobPosting.companyId;
            const company = await prisma.company.findUnique({ where: { id: targetCompanyId } });

            // Generate Temp Password
            const rawPassword = `Welcome@${new Date().getFullYear()}`;
            const hashedPassword = await bcrypt.hash(rawPassword, 12);

            // Generate Emp ID (Simple count + 1 for now)
            const count = await prisma.employeeProfile.count();
            const empId = `EMP-${(count + 1001).toString()}`;

            await prisma.$transaction(async (tx) => {
                // 1. Create User
                const newUser = await tx.user.create({
                    data: {
                        email: application.applicantEmail,
                        password: hashedPassword,
                        name: application.applicantName,
                        role: role || 'EXECUTIVE',
                        companyId: targetCompanyId,
                        isActive: true,
                        // Link Profile
                        employeeProfile: {
                            create: {
                                employeeId: empId,
                                designation: designation || application.jobPosting.title,
                                dateOfJoining: new Date(),
                                baseSalary: baseSalary ? parseFloat(baseSalary) : undefined,
                                phoneNumber: application.applicantPhone,
                                personalEmail: application.applicantEmail
                            }
                        }
                    },
                    include: { employeeProfile: true }
                });

                // 2. Auto-Generate Offer Letter (If Template Exists)
                const offerTemplate = await tx.documentTemplate.findFirst({
                    where: {
                        companyId: targetCompanyId,
                        type: 'OFFER_LETTER',
                        isActive: true
                    }
                });

                let offerDocId = null;

                if (offerTemplate) {
                    const vars = {
                        name: application.applicantName,
                        email: application.applicantEmail,
                        designation: designation || application.jobPosting.title,
                        date: new Date().toLocaleDateString('en-GB'),
                        salary: (baseSalary || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
                        address: 'Address to be updated', // we don't have address yet
                        joiningDate: new Date().toLocaleDateString('en-GB'),
                        companyName: company?.name || 'Company',
                        companyAddress: company?.address || '',
                    };

                    const content = hydrateTemplate(offerTemplate.content, vars);

                    const doc = await tx.digitalDocument.create({
                        data: {
                            templateId: offerTemplate.id,
                            employeeId: newUser.employeeProfile!.id,
                            title: 'Offer Letter',
                            content: content,
                            status: 'PENDING'
                        }
                    });
                    offerDocId = doc.id;
                }

                // 3. Update Application
                await tx.jobApplication.update({
                    where: { id: applicationId },
                    data: {
                        status: 'ONBOARDED',
                        offerLetterUrl: offerDocId ? `/documents/${offerDocId}` : null
                    }
                });

                // 4. Send Welcome Notification (Email)
                await createNotification({
                    userId: newUser.id,
                    title: 'Welcome to the Team! 🚀',
                    message: `Your account has been created. \nEmail: ${application.applicantEmail}\nPassword: ${rawPassword}\nPlease login and complete your onboarding tasks.`,
                    type: 'INFO',
                    channels: ['EMAIL', 'IN_APP'], // Force Email
                    link: '/dashboard/staff-portal'
                });

                return newUser;
            });

            return NextResponse.json({ success: true, message: `Applicant onboarded as ${role || 'Employee'}` });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
