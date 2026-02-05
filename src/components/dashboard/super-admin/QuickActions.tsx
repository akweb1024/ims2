
"use client";

import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
    Plus,
    Download,
    Settings,
    Users,
    Building2,
    FileText,
    BarChart3,
    Bell,
    TrendingUp,
    CreditCard
} from "lucide-react";

interface QuickActionsProps {
    onExport: () => void;
}

const actions = [
    {
        label: "Add New Company",
        icon: Building2,
        color: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
        route: "/dashboard/super-admin/companies/new"
    },
    {
        label: "Hire Employee",
        icon: Users,
        color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
        route: "/dashboard/hr-management/employees/new"
    },
    {
        label: "Generate Report",
        icon: FileText,
        color: "bg-violet-50 text-violet-600 hover:bg-violet-100",
        route: "/dashboard/reports"
    },
    {
        label: "View Analytics",
        icon: BarChart3,
        color: "bg-amber-50 text-amber-600 hover:bg-amber-100",
        route: "/dashboard/analytics"
    },
    {
        label: "System Settings",
        icon: Settings,
        color: "bg-secondary-50 text-secondary-600 hover:bg-secondary-100",
        route: "/dashboard/settings"
    },
    {
        label: "Send Announcement",
        icon: Bell,
        color: "bg-rose-50 text-rose-600 hover:bg-rose-100",
        route: "/dashboard/announcements/new"
    },
    {
        label: "Finance Control Tower",
        icon: CreditCard,
        color: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
        route: "/dashboard/finance"
    }
];

export default function QuickActions({ onExport }: QuickActionsProps) {
    const router = useRouter();

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                    <Zap size={20} className="text-primary-600" />
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {actions.map((action, idx) => (
                        <button
                            key={idx}
                            onClick={() => router.push(action.route)}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${action.color} group`}
                        >
                            <action.icon size={20} />
                            <span className="text-sm font-medium text-left">{action.label}</span>
                        </button>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-secondary-200 flex gap-3">
                    <button
                        onClick={() => router.push('/dashboard/super-admin/financials')}
                        className="flex-1 p-4 bg-primary-50 rounded-2xl border border-primary-100 flex flex-col items-center gap-2 hover:bg-primary-100 transition-colors group"
                    >
                        <div className="p-3 bg-white rounded-xl shadow-sm text-primary-600 group-hover:scale-110 transition-transform">
                            <TrendingUp size={24} />
                        </div>
                        <span className="text-[10px] font-black text-primary-700 uppercase tracking-widest">Financial Analytics</span>
                    </button>
                    <button
                        onClick={onExport}
                        className="flex-1 p-4 bg-secondary-50 rounded-2xl border border-secondary-100 flex flex-col items-center gap-2 hover:bg-secondary-100 transition-colors group"
                    >
                        <div className="p-3 bg-white rounded-xl shadow-sm text-secondary-600 group-hover:scale-110 transition-transform">
                            <Download size={24} />
                        </div>
                        <span className="text-[10px] font-black text-secondary-700 uppercase tracking-widest">Export Dashboard Data</span>
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}

function Zap({ size, className }: { size: number; className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    );
}
