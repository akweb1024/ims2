
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ClipboardList, Users, FileText, ChevronRight } from "lucide-react";

interface ApprovalsData {
    pendingIncrements: number;
    pendingLeaveApplications: number;
    pendingInvoices: number;
    total: number;
}

export default function PendingApprovals({ data }: { data: ApprovalsData }) {
    const items = [
        {
            label: "Increment Requests",
            count: data.pendingIncrements,
            icon: ClipboardList,
            color: "text-violet-600",
            bg: "bg-violet-50",
            route: "/dashboard/hr-management/increments"
        },
        {
            label: "Leave Applications",
            count: data.pendingLeaveApplications,
            icon: Users,
            color: "text-amber-600",
            bg: "bg-amber-50",
            route: "/dashboard/hr-management/leave"
        },
        {
            label: "Pending Invoices",
            count: data.pendingInvoices,
            icon: FileText,
            color: "text-rose-600",
            bg: "bg-rose-50",
            route: "/dashboard/finance"
        }
    ];

    const totalItems = items.reduce((acc, item) => acc + item.count, 0);

    return (
        <Card className="border-l-4 border-l-primary-500">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <ClipboardList className="text-primary-600" size={20} />
                        Pending Approvals
                    </span>
                    <Badge variant="secondary" className="bg-primary-100 text-primary-700">
                        {totalItems} Total
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {items.map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-lg bg-secondary-50 hover:bg-secondary-100 transition-colors cursor-pointer group"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
                                    <item.icon size={18} />
                                </div>
                                <div>
                                    <p className="font-medium text-secondary-900">{item.label}</p>
                                    <p className="text-xs text-secondary-500">{item.count} pending</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {item.count > 0 && (
                                    <Badge variant={item.count > 5 ? "destructive" : "outline"}>
                                        {item.count}
                                    </Badge>
                                )}
                                <ChevronRight size={16} className="text-secondary-400 group-hover:text-secondary-600 transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
