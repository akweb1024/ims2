import ManualAttendanceView from "@/components/dashboard/hr/ManualAttendanceView";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Manual Attendance Entry | HR Dashboard",
    description: "Manually manage and override employee attendance records.",
};

export default function ManualAttendancePage() {
    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-4xl font-black text-secondary-900 tracking-tight">
                    Manual Attendance
                </h1>
                <p className="text-secondary-500 font-medium mt-2 text-lg">
                    Override and manage attendance records manually.
                </p>
            </div>

            <ManualAttendanceView />
        </div>
    );
}
