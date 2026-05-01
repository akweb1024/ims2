import { redirect } from 'next/navigation';

export default function ManualAttendancePage() {
    redirect('/dashboard/hr-management?tab=attendance');
}
