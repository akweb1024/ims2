import CRMClientLayout from "./CRMClientLayout";
import DashboardSkeleton from "./DashboardSkeleton";

export default function Loading() {
    return (
        <CRMClientLayout>
            <div className="max-w-7xl mx-auto p-8">
                <DashboardSkeleton />
            </div>
        </CRMClientLayout>
    );
}
