
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

interface EmployeeStats {
    companyName: string;
    total: number;
    breakdown: Record<string, number>;
}

export default function EmployeeStatsSection({ data }: { data: EmployeeStats[] }) {
    // Get all unique employee types across all companies to create dynamic columns
    const allTypes = Array.from(new Set(data.flatMap(d => Object.keys(d.breakdown))));

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Employee Demographics</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 text-left border">Company</th>
                                <th className="p-3 text-right border font-bold">Total</th>
                                {allTypes.map(type => (
                                    <th key={type} className="p-3 text-center border capitalize">
                                        {type.replace(/_/g, ' ').toLowerCase()}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, idx) => (
                                <tr key={idx} className="border-b hover:bg-gray-50">
                                    <td className="p-3 border font-medium">{item.companyName}</td>
                                    <td className="p-3 border text-right font-bold">{item.total}</td>
                                    {allTypes.map(type => (
                                        <td key={type} className="p-3 border text-center text-gray-600">
                                            {item.breakdown[type] || '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
