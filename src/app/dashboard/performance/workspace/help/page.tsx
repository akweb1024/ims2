import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function PerformanceWorkspaceHelpPage() {
  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-3 border-b border-secondary-200 pb-5">
          <Link href="/dashboard/performance/workspace" className="text-sm font-bold text-primary-600 hover:underline">
            ← Back to Performance Workspace
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-black text-secondary-900">Performance Workspace Guide</h1>
          <p className="text-secondary-600 mt-2">
            Standard operating guide for employees, managers, and HR to run Goal, KPI, Task Template, and Monthly Review in one consistent workflow.
          </p>
        </div>

        <section className="card-premium p-6 space-y-4 border border-primary-200">
          <h2 className="text-xl font-black text-primary-700">Getting Started (5 min)</h2>
          <p className="text-sm text-secondary-700">
            Use this quick start if you are opening the module for the first time.
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-secondary-900 uppercase tracking-wide">For Employees</h3>
              <ol className="list-decimal list-inside text-sm text-secondary-700 space-y-1">
                <li>Open <b>Goals</b> tab and read your assigned goals.</li>
                <li>Open <b>KPIs</b> tab and check your target, period, and current value.</li>
                <li>Open <b>Task Templates</b> and confirm what recurring work drives your KPIs.</li>
                <li>Use top filters to show only your own records.</li>
                <li>At month end, review your score/grade in <b>Monthly Review</b>.</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-black text-secondary-900 uppercase tracking-wide">For Managers / HR</h3>
              <ol className="list-decimal list-inside text-sm text-secondary-700 space-y-1">
                <li>Create cycle outcomes in <b>Goals</b>.</li>
                <li>Set measurable targets in <b>KPIs</b>.</li>
                <li>Add reusable execution standards in <b>Task Templates</b>.</li>
                <li>Use employee/period/status filters for review meetings.</li>
                <li>Use <b>Monthly Review</b> to calibrate the next cycle.</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="card-premium p-6 space-y-4">
          <h2 className="text-xl font-black text-secondary-900">1) Unified Workflow</h2>
          <p className="text-sm text-secondary-700">Use this fixed sequence every cycle:</p>
          <div className="text-sm font-bold text-primary-700">Goal → KPI → Task Template → Monthly Review</div>
          <ul className="list-disc list-inside text-sm text-secondary-700 space-y-1">
            <li><b>Goal:</b> What outcome should be achieved.</li>
            <li><b>KPI:</b> How the outcome is measured.</li>
            <li><b>Task Template:</b> Repeatable execution pattern to drive KPI.</li>
            <li><b>Monthly Review:</b> Performance score, grade, and completion trend.</li>
          </ul>
        </section>

        <section className="card-premium p-6 space-y-4">
          <h2 className="text-xl font-black text-secondary-900">2) Manager / HR Operating Steps</h2>
          <ol className="list-decimal list-inside text-sm text-secondary-700 space-y-2">
            <li>Create or update employee goals in the <b>Goals</b> tab.</li>
            <li>Define measurable targets in the <b>KPIs</b> tab (period + unit + target).</li>
            <li>Set reusable or employee-specific execution blocks in <b>Task Templates</b>.</li>
            <li>At cycle end, review results in <b>Monthly Review</b>.</li>
            <li>Use review outcomes to calibrate next cycle goals and KPI targets.</li>
          </ol>
        </section>

        <section className="card-premium p-6 space-y-4">
          <h2 className="text-xl font-black text-secondary-900">3) Employee Operating Steps</h2>
          <ol className="list-decimal list-inside text-sm text-secondary-700 space-y-2">
            <li>Understand assigned goals and KPI expectations.</li>
            <li>Execute work aligned to active task templates.</li>
            <li>Track current KPI progress regularly.</li>
            <li>Review monthly score and grade with manager feedback.</li>
          </ol>
        </section>

        <section className="card-premium p-6 space-y-4">
          <h2 className="text-xl font-black text-secondary-900">4) Fast Filtering & Navigation</h2>
          <ul className="list-disc list-inside text-sm text-secondary-700 space-y-2">
            <li>Each tab supports quick filters: <b>Employee</b>, <b>Period</b>, <b>Status</b>.</li>
            <li>Use <b>Clear Filters</b> for instant reset.</li>
            <li>Filter state is saved in URL query params, so the same view returns after refresh/navigation.</li>
          </ul>
        </section>

        <section className="card-premium p-6 space-y-4">
          <h2 className="text-xl font-black text-secondary-900">5) Governance Rules</h2>
          <ul className="list-disc list-inside text-sm text-secondary-700 space-y-2">
            <li>Do not duplicate the same objective in multiple tabs.</li>
            <li>Prefer reusable task templates over one-off templates.</li>
            <li>Update KPI targets only at cycle boundaries unless a business exception is approved.</li>
            <li>Use Monthly Review as the source for target correction decisions.</li>
          </ul>
        </section>

        <section className="card-premium p-6 space-y-4">
          <h2 className="text-xl font-black text-secondary-900">6) Troubleshooting Checklist</h2>
          <ul className="list-disc list-inside text-sm text-secondary-700 space-y-2">
            <li>If data seems missing, check employee and period filters first.</li>
            <li>If edits fail, verify required fields and numeric values (no negatives).</li>
            <li>If module access differs by user, verify role permissions with HR/Admin.</li>
          </ul>
        </section>
      </div>
    </DashboardLayout>
  );
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
