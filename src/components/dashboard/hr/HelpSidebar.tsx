'use client';

type HelpContent = {
    title: string;
    description: string;
    steps: string[];
    tips?: string[];
};

const HELP_DATA: Record<string, HelpContent> = {
    'employees': {
        title: 'Managing Employees',
        description: 'The central database for all staff members. View, edit, onboard, or deactivate employees.',
        steps: [
            'Click "+ Onboard Employee" to add new staff.',
            'Use the search/filter bar to find specific people.',
            'Click on a row to edit details or view profile.',
            'Assign designations and departments during onboarding.'
        ],
        tips: ['Deactivating an employee removes their system access immediately.']
    },
    'payroll': {
        title: 'Payroll Management',
        description: 'Generate salary slips, manage arrears, and track monthly payouts.',
        steps: [
            'Ensure salary structures are defined first.',
            'Click "Generate Bulk Payroll" for monthly processing.',
            'Review auto-calculated Tax and PF deductions.',
            'Download PDF slips for distribution.'
        ],
        tips: ['Arrears from previous months are auto-added if recorded.']
    },
    'recruitment': {
        title: 'Recruitment & ATS',
        description: 'Manage the entire hiring lifecycle from job posting to offer letter.',
        steps: [
            'Create "Job Postings" for open roles.',
            'Track candidates in the "Pipeline" (Kanban board).',
            'Schedule interviews directly from the candidate card.',
            'Move candidates to "Hired" to start onboarding.'
        ]
    },
    'budgets': {
        title: 'Department Budgets',
        description: 'Allocate and track fiscal budgets for each department.',
        steps: [
            'Select a department and fiscal year.',
            'Set the "Allocated Amount".',
            'The system tracks "Utilized" amount based on payroll and expenses.',
            'Monitor the progress bar to avoid overspending.'
        ]
    },
    'final-settlement': {
        title: 'Full & Final Settlement',
        description: 'Process employee exits and calculate final dues.',
        steps: [
            'Select an exiting employee.',
            'Enter "Resignation Date" and "Exit Date".',
            'System auto-calculates notice period shortfall and leave encashment.',
            'Generate the final settlement statement.'
        ]
    },
    'leaves': {
        title: 'Leave Management',
        description: 'Review and approve/reject employee leave requests.',
        steps: [
            'Pending requests appear at the top.',
            'Check leave balances before approving.',
            'Approved leaves are deducted from the employee quota.',
            'Rejected leaves are returned to the balance.'
        ]
    },
    'attendance': {
        title: 'Attendance Tracking',
        description: 'Monitor daily check-ins and working hours.',
        steps: [
            'View daily logs in the calendar or list view.',
            'Correct "Missed Punches" or "Absent" marks.',
            'Sync with biometric devices if integrated.',
            'Regularize attendance for field visits.'
        ]
    }
};

export default function HelpSidebar({ isOpen, onClose, activeTab }: { isOpen: boolean, onClose: () => void, activeTab: string }) {
    const content = HELP_DATA[activeTab] || {
        title: 'HR Management',
        description: 'Select a module to see specific help instructions.',
        steps: []
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-[60] border-l border-secondary-200 animate-in slide-in-from-right duration-300 transform">
            <div className="h-full flex flex-col">
                <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/50">
                    <h3 className="font-black text-secondary-900 uppercase tracking-tight flex items-center gap-2">
                        <span className="text-xl">💡</span> Help & Guide
                    </h3>
                    <button onClick={onClose} className="text-secondary-400 hover:text-secondary-900 text-2xl">×</button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <h4 className="text-lg font-bold text-primary-600 mb-2">{content.title}</h4>
                    <p className="text-sm text-secondary-600 mb-6 leading-relaxed">{content.description}</p>

                    {content.steps.length > 0 && (
                        <div className="mb-6">
                            <h5 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-3">How to use</h5>
                            <ul className="space-y-3">
                                {content.steps.map((step, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-secondary-700">
                                        <span className="w-5 h-5 rounded-full bg-secondary-100 flex items-center justify-center text-[10px] font-bold text-secondary-600 shrink-0 mt-0.5">{i + 1}</span>
                                        {step}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {content.tips && (
                        <div className="bg-warning-50 p-4 rounded-xl border border-warning-100">
                            <h5 className="text-[10px] font-black text-warning-700 uppercase tracking-widest mb-2">Pro Tip</h5>
                            <ul className="list-disc list-inside space-y-1">
                                {content.tips.map((tip, i) => (
                                    <li key={i} className="text-xs font-medium text-warning-800">{tip}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-secondary-100 bg-secondary-50/30">
                    <a href="/dashboard/knowledge-base" className="text-xs font-bold text-primary-600 hover:underline block text-center">Visit Full Knowledge Base →</a>
                </div>
            </div>
        </div>
    );
}
