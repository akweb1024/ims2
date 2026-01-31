
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SalaryData {
    byManager: Array<{ managerId: string; managerName: string; totalExpenditure: number }>;
    byDepartment: Array<{ name: string; total: number }>;
    breakdown?: { fixed: number; variable: number; incentive: number };
}

export default function SalaryAnalysisSection({ data }: { data: SalaryData }) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Salary Analysis</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department Wise */}
                <Card>
                    <CardHeader>
                        <CardTitle>Expenditure by Department</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.byDepartment} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: any) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(value)} />
                                <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20}>
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Manager Wise */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Spenders (Managers)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.byManager.map((manager, idx) => (
                                <div key={manager.managerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{manager.managerName}</p>
                                            <p className="text-xs text-gray-500">Manager</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(manager.totalExpenditure)}
                                        </p>
                                        <p className="text-xs text-gray-500">Total Team CTC</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Component Breakdown (New) */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Salary Structure Distribution (Global)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[data.breakdown]} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`} />
                                <YAxis type="category" dataKey="name" hide />
                                <Tooltip formatter={(value: any) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(value)} />
                                <Bar dataKey="fixed" name="Fixed Salary" stackId="a" fill="#3b82f6" radius={[4, 0, 0, 4]} />
                                <Bar dataKey="variable" name="Variable Pay" stackId="a" fill="#f59e0b" />
                                <Bar dataKey="incentive" name="Incentives" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
