import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createNotification } from '@/lib/system-notifications';
import { sendEmail, EmailTemplates } from '@/lib/email';
import { provisionEmployee } from '@/lib/kra/provision';
import { buildLetterVars, hydrate } from '@/lib/services/documents/letterVars';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const { applicationId, role, designation, companyId, baseSalary, gradeId } = await req.json();

            const application = await prisma.jobApplication.findUnique({
                where: { id: applicationId },
                include: { jobPosting: true }
            });

            // OFFER qualifies too: screening submit advances candidates to OFFER
            // automatically, but nothing programmatic ever sets SELECTED, so gating
            // on SELECTED alone stalled hires until someone dragged the card.
            if (!application || !['OFFER', 'SELECTED'].includes(application.status)) {
                return createErrorResponse('Application not eligible for onboarding', 400);
            }

            // Determine Company ID
            const targetCompanyId = companyId || application.jobPosting.companyId;

            // Fitment gate (§40): the chosen grade must belong to the hiring company.
            let resolvedGradeId: string | null = null;
            if (gradeId) {
                const grade = await prisma.grade.findFirst({ where: { id: gradeId, companyId: targetCompanyId }, select: { id: true } });
                if (!grade) return createErrorResponse('Selected grade does not belong to this company', 400);
                resolvedGradeId = grade.id;
            }
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
                                ...(resolvedGradeId ? { gradeId: resolvedGradeId } : {}),
                                phoneNumber: application.applicantPhone,
                                personalEmail: application.applicantEmail,
                                // Initialise the onboarding workflow so HR sees the new hire as
                                // pending in the tracker immediately (was lazily null until first GET).
                                metrics: {
                                    onboardingWorkflow: {
                                        version: 1,
                                        status: 'ONBOARDING_DRAFT',
                                        steps: {},
                                        currentStep: 'joining',
                                        updatedAt: new Date().toISOString(),
                                    },
                                },
                            }
                        }
                    },
                    include: { employeeProfile: true }
                });

                // 2. Auto-generate the offer and appointment letters from the company's
                //    active templates. Missing template ⇒ that letter is silently skipped
                //    (same opt-in behaviour the offer letter has always had). Real employee
                //    profile was just created above — hydrate with the shared full placeholder
                //    set so letters never leak raw {{ctcAnnual}}, {{employeeId}}, etc.
                const employeeForVars = { ...newUser.employeeProfile!, user: newUser };
                const issueLetter = async (type: string, title: string): Promise<string | null> => {
                    const template = await tx.documentTemplate.findFirst({
                        where: { companyId: targetCompanyId, type, isActive: true }
                    });
                    if (!template) return null;
                    const content = hydrate(template.content, buildLetterVars(employeeForVars, company));
                    const doc = await tx.digitalDocument.create({
                        data: {
                            templateId: template.id,
                            employeeId: newUser.employeeProfile!.id,
                            title,
                            content,
                            status: 'PENDING'
                        }
                    });
                    return doc.id;
                };

                const offerDocId = await issueLetter('OFFER_LETTER', 'Offer Letter');
                // Appointment letter is the formal engagement doc; issue it as a draft so
                // HR can review before it's shared. Lives on the employee's digital documents.
                await issueLetter('APPOINTMENT_LETTER', 'Appointment Letter');

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
                        // Onboarding invite — give the new hire 7 days, not 1 hour.
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    }
                });

                onboardedUser = newUser;
            });

            // New-hire KRA/Goals auto-provisioning (idempotent; non-fatal).
            if (onboardedUser) {
                try {
                    await provisionEmployee(onboardedUser.id, user.id);
                } catch (err) {
                    console.error('KRA provisioning failed for onboarded user:', err);
                }
            }

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
