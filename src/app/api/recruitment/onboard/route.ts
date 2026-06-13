import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createNotification } from '@/lib/system-notifications';
import { sendEmail, EmailTemplates } from '@/lib/email';

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
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'],
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
            const inviteToken = crypto.randomBytes(32).toString('hex');
            const inviteUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${inviteToken}`;
            const hashedPassword = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 12);
            let onboardedUser: any = null;

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

                await tx.passwordResetToken.deleteMany({
                    where: { userId: newUser.id }
                });

                await tx.passwordResetToken.create({
                    data: {
                        token: inviteToken,
                        userId: newUser.id,
                        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
                    }
                });

                onboardedUser = newUser;
            });

            const inviteTemplate = EmailTemplates.onboardingInvite(application.applicantName, inviteUrl);
            const deliveryResults = await Promise.allSettled([
                sendEmail({
                    to: application.applicantEmail,
                    subject: inviteTemplate.subject,
                    text: inviteTemplate.text,
                    html: inviteTemplate.html,
                }),
                createNotification({
                    userId: onboardedUser.id,
                    title: 'Welcome to the Team! 🚀',
                    message: 'Your account is ready. Use the onboarding invite sent to your email to set your password and begin the onboarding flow.',
                    type: 'INFO',
                    channels: ['IN_APP'],
                    category: 'ONBOARDING',
                    link: `/reset-password?token=${inviteToken}`
                })
            ]);

            const emailFailure = deliveryResults[0].status === 'rejected' ? deliveryResults[0].reason : null;
            if (emailFailure) {
                console.error('Failed to send onboarding invite email:', emailFailure);
            }

            return NextResponse.json({ success: true, message: `Applicant onboarded as ${role || 'Employee'}` });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
