'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import EmployeeOnboardingWorkflow from '@/components/dashboard/hr/EmployeeOnboardingWorkflow';

export default function EmployeeWorkflowPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState('MANAGER');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUserRole(JSON.parse(userData).role || 'MANAGER');
    }
  }, []);

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6 pb-20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-full p-2 transition-colors hover:bg-secondary-100"
              aria-label="Go back"
            >
              <ArrowLeft className="h-6 w-6 text-secondary-600" />
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-secondary-900">Onboarding & Profile Workflow</h1>
              <p className="font-medium text-secondary-500">Step-wise employee onboarding and profile upgrade orchestration</p>
            </div>
          </div>
          <Link
            href="/dashboard/hr-management/onboarding/help"
            className="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-secondary-200 bg-white text-secondary-500 transition-colors hover:border-primary-300 hover:text-primary-600"
            aria-label="Open Onboarding SOP"
          >
            <BookOpen className="h-4 w-4" />
            <span className="pointer-events-none absolute left-1/2 top-10 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-secondary-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg group-hover:block">
              Open Onboarding SOP
            </span>
          </Link>
        </div>

        <EmployeeOnboardingWorkflow />
      </div>
    </>
  );
}
