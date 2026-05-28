'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ArrowLeft } from 'lucide-react';
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
    <DashboardLayout userRole={userRole}>
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-secondary-100 rounded-full transition-colors" aria-label="Go back">
            <ArrowLeft className="w-6 h-6 text-secondary-600" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-secondary-900 tracking-tight">Onboarding & Profile Workflow</h1>
            <p className="text-secondary-500 font-medium">Step-wise employee onboarding and profile upgrade orchestration</p>
          </div>
        </div>

        <EmployeeOnboardingWorkflow />
      </div>
    </DashboardLayout>
  );
}
