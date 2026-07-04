import DashboardLayout from '@/components/dashboard/DashboardLayout';

// Single mount point for the dashboard chrome (header, sidebar, widgets).
// Pages under /dashboard must NOT wrap themselves in <DashboardLayout> —
// this layout persists across navigations, so the sidebar, notification
// stream and widgets survive page changes instead of remounting.
export default function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
    return <DashboardLayout>{children}</DashboardLayout>;
}
