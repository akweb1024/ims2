
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AlertTriangle, Info, CheckCircle, X } from "lucide-react";

interface AlertItem {
    type: 'warning' | 'info' | 'success';
    title: string;
    message: string;
    companies?: string[];
}

interface AlertsData {
    alerts: AlertItem[];
}

export default function AlertsWidget({ data }: { data: AlertsData }) {
    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'warning':
                return <AlertTriangle size={18} className="text-amber-500" />;
            case 'info':
                return <Info size={18} className="text-blue-500" />;
            case 'success':
                return <CheckCircle size={18} className="text-emerald-500" />;
            default:
                return <Info size={18} className="text-blue-500" />;
        }
    };

    const getAlertStyles = (type: string) => {
        switch (type) {
            case 'warning':
                return 'bg-amber-50 border-amber-200';
            case 'info':
                return 'bg-blue-50 border-blue-200';
            case 'success':
                return 'bg-emerald-50 border-emerald-200';
            default:
                return 'bg-blue-50 border-blue-200';
        }
    };

    if (data.alerts.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                        <Bell size={20} className="text-primary-600" />
                        Insights & Alerts
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8 text-secondary-500">
                        <div className="text-center">
                            <CheckCircle size={40} className="mx-auto text-emerald-400 mb-2" />
                            <p className="text-sm">All systems operational</p>
                            <p className="text-xs text-secondary-400">No critical alerts at this time</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Bell size={20} className="text-primary-600" />
                        Insights & Alerts
                    </span>
                    <Badge variant="secondary" className="bg-primary-100 text-primary-700">
                        {data.alerts.length}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {data.alerts.map((alert, idx) => (
                        <div
                            key={idx}
                            className={`p-3 rounded-lg border ${getAlertStyles(alert.type)}`}
                        >
                            <div className="flex items-start gap-3">
                                {getAlertIcon(alert.type)}
                                <div className="flex-1">
                                    <p className="font-medium text-secondary-900 text-sm">{alert.title}</p>
                                    <p className="text-xs text-secondary-600 mt-1">{alert.message}</p>
                                    {alert.companies && alert.companies.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {alert.companies.slice(0, 3).map((company, cIdx) => (
                                                <Badge key={cIdx} variant="outline" className="text-xs">
                                                    {company}
                                                </Badge>
                                            ))}
                                            {alert.companies.length > 3 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{alert.companies.length - 3} more
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function Bell({ size, className }: { size: number; className?: string }) {
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
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
    );
}
