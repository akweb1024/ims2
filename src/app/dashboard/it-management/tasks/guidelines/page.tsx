'use client';

import React from 'react';
import { BookOpen, CheckCircle, ShieldAlert, Cpu, Layers, Link as LinkIcon, DollarSign, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ITGuidelinesPage() {
    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <BookOpen className="h-8 w-8 text-blue-600" />
                        IT Projects & Task Board Guidelines
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm md:text-base">
                        Standard Operating Procedures for managing tracking, and delivering IT projects and tasks.
                    </p>
                </div>
                <Link href="/dashboard/it-management">
                    <button className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                    </button>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Projects Section */}
                    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
                            <Layers className="h-6 w-6 text-indigo-500" />
                            1. Managing IT Projects
                        </h2>
                        <div className="space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                            <p>
                                <strong>Projects</strong> act as high-level containers for overarching goals, milestones, and deliverables. They group multiple tasks together.
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Always assign a <strong>Project Manager</strong> and a <strong>Team Lead</strong>. This ensures accountability.</li>
                                <li>Set realistic <strong>Estimated Hours</strong> at the project level to gauge overall capacity versus actual logging.</li>
                                <li>Use <strong>Milestones</strong> to map out major delivery phases. Milestones can be linked to payment phases if the project is client-facing.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Tasks Section */}
                    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
                            <CheckCircle className="h-6 w-6 text-green-500" />
                            2. Operating the Task Board
                        </h2>
                        <div className="space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                            <p>
                                <strong>Tasks</strong> are granular, actionable items assigned to individual personnel. The Task Board tracks these items through their lifecycle.
                            </p>
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 mb-4">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Task Status Workflow:</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-center"><span className="text-gray-500 font-bold">PENDING</span><br/>To Do / Backlog</div>
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-center"><span className="text-blue-500 font-bold">IN PROGRESS</span><br/>Actively worked on</div>
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-center"><span className="text-orange-500 font-bold">UNDER REVIEW</span><br/>Awaiting QA/Approval</div>
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-center"><span className="text-green-500 font-bold">COMPLETED</span><br/>Done & Delivered</div>
                                </div>
                            </div>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Dependencies:</strong> Use dependencies (blocking tasks) carefully. If Task B depends on Task A, Task B should not be started until Task A is <span className="text-green-600 dark:text-green-400 font-medium">COMPLETED</span>.</li>
                                <li><strong>Reporting:</strong> The Reporter is usually the person who requested the task. The Assignee is the IT personnel responsible for execution.</li>
                                <li><strong>Updates:</strong> When modifying a task, closing out empty relationships (e.g. removing an assignee) is safely handled by the system.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Revenue & Billing Section */}
                    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
                            <DollarSign className="h-6 w-6 text-emerald-500" />
                            3. Revenue & Billing Mechanics
                        </h2>
                        <div className="space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                            <p>
                                The IT Management module integrates deeply with internal revenue tracking. When tasks or projects denote financial value, IT department earnings are calculated dynamically.
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>IT Department Cut (%):</strong> Specify the percentage of the <em>Actual Value</em> that the IT department keeps. This calculates the <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-pink-600 dark:text-pink-400">itRevenueEarned</code>.</li>
                                <li><strong>Service Requests:</strong> When an IT Task is categorized as a <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">SERVICE_REQUEST</code>, setting the status from <strong>UNDER REVIEW</strong> to <strong>COMPLETED</strong> automatically marks the task as <em>Paid/Credited</em> and locks in the final revenue earned based on actual/estimated values.</li>
                                <li><strong>Time Entries:</strong> Time logged against tasks can be marked as <strong>Billable</strong>. Always log actual hours directly in the task to ensure accurate capacity reporting.</li>
                            </ul>
                        </div>
                    </section>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    {/* Security & Access */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <ShieldAlert className="h-6 w-6 text-red-400" />
                            <h3 className="font-bold text-lg">Access & Permissions</h3>
                        </div>
                        <ul className="space-y-3 text-sm text-slate-300">
                            <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" /> <strong>Super Admins & IT Managers</strong> have global edit, delete, and assignment rights across all projects and tasks.</li>
                            <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" /> <strong>Project Managers & Team Leads</strong> can update details for projects they are explicitly assigned to govern.</li>
                            <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" /> <strong>Standard Employees</strong> can view tasks they are assigned to, log time, and add comments.</li>
                        </ul>
                    </div>

                    {/* Quick Tips */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-6">
                        <h3 className="font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2 mb-4">
                            <Cpu className="h-5 w-5" /> Quick Tips
                        </h3>
                        <ul className="space-y-3 text-sm text-blue-800 dark:text-blue-200/80">
                            <li>Keep task descriptions concise but explicit. Attach links or files directly.</li>
                            <li>Update the <strong>Progress Slider</strong> incrementally as you work to keep Project Managers informed without needing meetings.</li>
                            <li>Use <strong>Blockers</strong> explicitly in comments or task edits if you are stuck waiting on another dependency.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
