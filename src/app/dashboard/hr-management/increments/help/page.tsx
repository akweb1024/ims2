import { FiArrowLeft, FiInfo, FiTrendingUp, FiShield, FiAlertTriangle } from 'react-icons/fi';
import Link from 'next/link';
import HRClientLayout from '../../HRClientLayout';

export default function IncrementHelpPage() {
    return (
        <HRClientLayout>
            <div className="p-8 max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4 border-b border-secondary-200 pb-6">
                    <Link
                        href="/dashboard/hr-management/increments"
                        className="p-2 hover:bg-secondary-100 rounded-full transition-colors text-secondary-500"
                    >
                        <FiArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">
                            Salary Increments Guide
                        </h1>
                        <p className="text-secondary-600 mt-1">
                            Understanding the workflow, roles, and policies for compensation changes.
                        </p>
                    </div>
                </div>

                {/* Workflow Section */}
                <section className="bg-white rounded-2xl border border-secondary-200 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-primary-50 rounded-lg text-primary-600">
                            <FiTrendingUp className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-secondary-900">The 3-Phase Increment Workflow</h2>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-secondary-50 p-6 rounded-xl border border-secondary-100 relative">
                            <div className="absolute -top-4 -right-4 w-8 h-8 bg-white border-2 border-primary-500 text-primary-600 rounded-full flex items-center justify-center font-bold shadow-sm">1</div>
                            <h3 className="font-bold text-secondary-900 mb-2">Manager Proposal</h3>
                            <p className="text-sm text-secondary-600">
                                Managers initiate the process by evaluating team members and proposing an <b>Increment Percentage</b> based on performance ratings. These are submitted as <i>Drafts</i>.
                            </p>
                        </div>
                        <div className="bg-secondary-50 p-6 rounded-xl border border-secondary-100 relative">
                            <div className="absolute -top-4 -right-4 w-8 h-8 bg-white border-2 border-amber-500 text-amber-600 rounded-full flex items-center justify-center font-bold shadow-sm">2</div>
                            <h3 className="font-bold text-secondary-900 mb-2">HR Review</h3>
                            <p className="text-sm text-secondary-600">
                                Human Resources reviews the drafts, cross-checks with budget allocations, confirms validations, and formalizes the exact monetary changes before passing to leadership.
                            </p>
                        </div>
                        <div className="bg-secondary-50 p-6 rounded-xl border border-secondary-100 relative">
                            <div className="absolute -top-4 -right-4 w-8 h-8 bg-white border-2 border-green-500 text-green-600 rounded-full flex items-center justify-center font-bold shadow-sm">3</div>
                            <h3 className="font-bold text-secondary-900 mb-2">MD Approval</h3>
                            <p className="text-sm text-secondary-600">
                                The Managing Director gives the final sign-off. Once approved, the new compensation structure becomes active and letters are automatically generated.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Visibility Rules */}
                <section className="bg-white rounded-2xl border border-secondary-200 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                            <FiShield className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-secondary-900">Role-Based Visibility (RBAC)</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-secondary-50 transition-colors">
                            <div className="w-32 font-bold text-secondary-900 shrink-0 mt-1">Managers</div>
                            <div>
                                <p className="text-secondary-700">Managers and Team Leaders <b>cannot</b> see exact salary figures (e.g., Base Salary, Fixed/Variable splits) for their subordinates. They evaluate purely on performance and propose percentage increases (e.g., 10%). The system calculates the monetary value securely in the background.</p>
                            </div>
                        </div>
                        <div className="h-px bg-secondary-100" />
                        <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-secondary-50 transition-colors">
                            <div className="w-32 font-bold text-secondary-900 shrink-0 mt-1">HR & Finance</div>
                            <div>
                                <p className="text-secondary-700">Administrators, HR Managers, and Finance admins have full visibility into the detailed compensation structures, including historical trends, CTC components, and exact increment amounts before approval.</p>
                            </div>
                        </div>
                        <div className="h-px bg-secondary-100" />
                        <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-secondary-50 transition-colors">
                            <div className="w-32 font-bold text-secondary-900 shrink-0 mt-1">Employees</div>
                            <div>
                                <p className="text-secondary-700">Standard employees cannot access the Increment Planning dashboard. They only receive notifications once their increment has been fully approved by the MD.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Policy Validations */}
                <section className="bg-white rounded-2xl border border-secondary-200 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
                            <FiAlertTriangle className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-secondary-900">Policy Constraints & Validations</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="border border-rose-100 bg-rose-50/30 p-5 rounded-xl">
                            <h3 className="font-bold text-rose-900 flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full bg-rose-500" /> Probation Period
                            </h3>
                            <p className="text-sm text-secondary-700 leading-relaxed">
                                Employees must complete a minimum tenure of <b>6 months</b> before they are eligible for any salary increments. The proposal capability is automatically disabled for newer hires.
                            </p>
                        </div>
                        
                        <div className="border border-rose-100 bg-rose-50/30 p-5 rounded-xl">
                            <h3 className="font-bold text-rose-900 flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full bg-rose-500" /> Active PIPs
                            </h3>
                            <p className="text-sm text-secondary-700 leading-relaxed">
                                Employees currently placed on a Performance Improvement Plan (PIP) are not eligible for increments until they successfully complete the plan and return to normal standing.
                            </p>
                        </div>

                        <div className="border border-rose-100 bg-rose-50/30 p-5 rounded-xl">
                            <h3 className="font-bold text-rose-900 flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full bg-rose-500" /> Notice Period
                            </h3>
                            <p className="text-sm text-secondary-700 leading-relaxed">
                                Personnel currently serving their notice period are disqualified from the increment cycle, as they are actively separating from the company.
                            </p>
                        </div>

                        <div className="border border-indigo-100 bg-indigo-50/30 p-5 rounded-xl">
                            <h3 className="font-bold text-indigo-900 flex items-center gap-2 mb-2">
                                <FiInfo className="text-indigo-500" /> Recommended Guidelines
                            </h3>
                            <ul className="text-sm text-secondary-700 leading-relaxed space-y-1 list-disc list-inside">
                                <li><b>Rating A (Outstanding):</b> 10% - 12% increase</li>
                                <li><b>Rating B (Exceeds):</b> 7% - 9% increase</li>
                                <li><b>Rating C (Meets):</b> 0% - 6% increase</li>
                            </ul>
                        </div>
                    </div>
                </section>
                
                <div className="text-center py-6">
                    <p className="text-sm text-secondary-500">
                        ITBREAK Business Operating System • HR Management Protocols
                    </p>
                </div>
            </div>
        </HRClientLayout>
    );
}
