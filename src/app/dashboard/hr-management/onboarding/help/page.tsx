import Link from 'next/link';
import Image from 'next/image';
import HRClientLayout from '../../HRClientLayout';
import type { ReactNode } from 'react';
import { FiArrowLeft, FiAlertCircle, FiCheckCircle, FiClock, FiLock, FiMail, FiFileText } from 'react-icons/fi';

export default function OnboardingSOPPage() {
    return (
        <HRClientLayout>
            <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex items-center gap-4 border-b border-secondary-200 pb-6">
                    <Link
                        href="/dashboard/hr-management/employees/workflow"
                        className="p-2 hover:bg-secondary-100 rounded-full transition-colors text-secondary-500"
                    >
                        <FiArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Onboarding SOP</h1>
                        <p className="text-secondary-600 mt-1">
                            Short operating guide for HR, managers, and admins who move candidates into employee onboarding.
                        </p>
                    </div>
                </div>

                <section className="card-premium p-6 space-y-5">
                    <div className="flex items-start gap-4">
                        <div className="shrink-0 p-3 bg-primary-50 rounded-lg text-primary-600">
                            <FiFileText className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black leading-tight text-secondary-900">Process at a Glance</h2>
                            <p className="text-sm leading-relaxed text-secondary-600">
                                Use this sequence every time a selected candidate becomes a new employee.
                            </p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4">
                        <StepCard number="1" title="Select Candidate" text="Move the applicant to SELECTED in recruitment before onboarding." />
                        <StepCard number="2" title="Trigger Invite" text="Use Onboard from the recruitment board to create the user, profile, and invite token." />
                        <StepCard number="3" title="Complete Steps" text="Fill joining, verification, job, and perks in the workflow screen." />
                        <StepCard number="4" title="Approve & Monitor" text="Approve verification/perks, review summaries, and watch completion status." />
                    </div>
                </section>

                <section className="card-premium p-6 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="shrink-0 p-3 bg-emerald-50 rounded-lg text-emerald-600">
                            <FiCheckCircle className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-black leading-tight text-secondary-900">Admin Checklist</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm text-secondary-700">
                        <ul className="list-disc list-inside space-y-2">
                            <li>Confirm the candidate is in <b>SELECTED</b> state.</li>
                            <li>Click <b>Onboard</b> from the recruitment board.</li>
                            <li>Check that the invite email is sent and the reset token exists.</li>
                            <li>Verify the employee can reach <b>/reset-password</b> and set a password.</li>
                        </ul>
                        <ul className="list-disc list-inside space-y-2">
                            <li>Complete the four workflow steps in order.</li>
                            <li>Save perks details in the workflow state, not in a separate hidden record.</li>
                            <li>Approve verification and perks only after validation.</li>
                            <li>Use the summary cards to spot pending approvals or blocked cases.</li>
                        </ul>
                    </div>
                </section>

                <section className="card-premium p-6 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="shrink-0 p-3 bg-indigo-50 rounded-lg text-indigo-600">
                            <FiClock className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-black leading-tight text-secondary-900">Operational Rules</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <Rule icon={<FiMail />} title="Invite delivery" text="Use the one-time invite link only. Do not reuse passwords across hires." />
                        <Rule icon={<FiLock />} title="Workflow truth" text="Treat employeeProfile.metrics.onboardingWorkflow as the source of truth for the employee journey." />
                        <Rule icon={<FiAlertCircle />} title="Compliance" text="Only applicable onboarding modules should count toward compliance and readiness." />
                        <Rule icon={<FiCheckCircle />} title="Approvals" text="Verification and perks are the approval-gated steps; keep the audit trail intact." />
                    </div>
                </section>

                <section className="card-premium p-6 space-y-5">
                    <div className="flex items-start gap-4">
                        <div className="shrink-0 p-3 bg-amber-50 rounded-lg text-amber-600">
                            <FiFileText className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black leading-tight text-secondary-900">Architecture Diagram</h2>
                            <p className="text-sm leading-relaxed text-secondary-600 max-w-3xl">
                                This diagram shows the recruitment handoff, the onboarding workflow state, and the module/compliance loop. It is the canonical SVG used by the architecture doc.
                            </p>
                        </div>
                    </div>
                    <div className="overflow-hidden rounded-[1.5rem] border border-secondary-200 bg-secondary-50 p-3 shadow-sm">
                        <Image
                            src="/images/hr-onboarding-architecture.svg"
                            alt="HR hiring and onboarding architecture diagram"
                            width={1600}
                            height={900}
                            className="block w-full h-auto rounded-[1.1rem] bg-white"
                            priority
                        />
                        <div className="mt-3 flex items-center justify-between gap-3 px-1">
                            <p className="text-xs font-medium text-secondary-500">
                                Vector diagram for crisp zooming on desktop and mobile.
                            </p>
                            <a
                                href="/images/hr-onboarding-architecture.svg"
                                className="text-xs font-black uppercase tracking-[0.14em] text-primary-600 hover:text-primary-700"
                                download
                            >
                                Download SVG
                            </a>
                        </div>
                    </div>
                </section>
            </div>
        </HRClientLayout>
    );
}

function StepCard({ number, title, text }: { number: string; title: string; text: string; }) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-secondary-200 bg-secondary-50 p-5">
            <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-primary-200 bg-white text-sm font-black text-primary-700 shadow-sm">
                {number}
            </div>
            <h3 className="pr-10 font-black leading-tight text-secondary-900">{title}</h3>
            <p className="text-sm text-secondary-600 mt-2 leading-relaxed">{text}</p>
        </div>
    );
}

function Rule({ icon, title, text }: { icon: ReactNode; title: string; text: string; }) {
    return (
        <div className="rounded-2xl border border-secondary-200 bg-white p-5">
            <div className="mb-2 flex items-center gap-2">
                <div className="shrink-0 text-primary-600">{icon}</div>
                <h3 className="font-black leading-tight text-secondary-900">{title}</h3>
            </div>
            <p className="text-sm text-secondary-600 leading-relaxed">{text}</p>
        </div>
    );
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
