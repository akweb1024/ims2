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

// Derive the next employee ID from the highest existing EMP-<n>. The old
// row-count approach reused a number after any profile deletion (employeeId is
// @unique, so the reuse made the whole onboard fail); max+1 is stable, and the
// caller retries on the concurrent-insert race.
async function nextEmployeeId(): Promise<string> {
    const rows = await prisma.employeeProfile.findMany({
        where: { employeeId: { startsWith: 'EMP-' } },
        select: { employeeId: true },
    });
    let maxNum = 1000;
    for (const r of rows) {
        const n = parseInt((r.employeeId ?? '').slice(4), 10);
        if (Number.isFinite(n) && n > maxNum) maxNum = n;
    }
    return `EMP-${maxNum + 1}`;
}

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

            // Retry on an employeeId unique-constraint collision (a concurrent onboard
            // picking the same number); nextEmployeeId re-reads the max each pass.
            for (let attempt = 1; ; attempt++) {
              const empId = await nextEmployeeId();
              try {
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
                    // Real employee profile was just created above — hydrate with the shared full
                    // placeholder set so offer letters never leak raw {{ctcAnnual}}, {{employeeId}}, etc.
                    const employeeForVars = { ...newUser.employeeProfile!, user: newUser };
                    const content = hydrate(offerTemplate.content, buildLetterVars(employeeForVars, company));

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
                        // Onboarding invite — give the new hire 7 days, not 1 hour.
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    }
                });

                onboardedUser = newUser;
                });
                break;
              } catch (err: any) {
                // Only an employeeId collision is retryable; a duplicate email means the
                // applicant already has an account — a real error, so rethrow it.
                const target = JSON.stringify(err?.meta?.target ?? '');
                if (err?.code === 'P2002' && target.includes('employeeId') && attempt < 5) continue;
                throw err;
              }
            }

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
