import DashboardLayout from '@/components/dashboard/DashboardLayout';
import LMSParticipantsView from '@/components/dashboard/lms/participants/LMSParticipantsView';
import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Users, LayoutDashboard } from 'lucide-react';

export const metadata: Metadata = {
  title: 'LMS Participants - Panoptical IMS',
  description: 'Manage and view external registrations from Nanoschool.',
};

export default function ParticipantsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumbs & Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-secondary-500">
            <Link href="/dashboard" className="hover:text-indigo-600 flex items-center gap-1">
              <LayoutDashboard size={14} /> Dashboard
            </Link>
            <ChevronRight size={14} />
            <Link href="/dashboard/lms" className="hover:text-indigo-600">
              LMS
            </Link>
            <ChevronRight size={14} />
            <span className="text-secondary-900 font-medium">Participants</span>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black text-secondary-900 flex items-center gap-3">
                <Users className="text-indigo-600" /> External Participants
              </h1>
              <p className="text-secondary-500 mt-1">
                Viewing registration data synced from nanoschool.in
              </p>
            </div>
            <div className="flex gap-3">
               <Link href="/dashboard/lms" className="btn btn-secondary text-sm">
                 Back to LMS
               </Link>
            </div>
          </div>
        </div>

        <LMSParticipantsView />
      </div>
    </DashboardLayout>
  );
}
