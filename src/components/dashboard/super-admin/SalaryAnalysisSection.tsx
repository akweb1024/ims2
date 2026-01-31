
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SalaryData {
    byManager: Array<{ managerId: string; managerName: string; totalExpenditure: number }>;
    byDepartment: Array<{ name: string; total: number }>;
    breakdown?: { fixed: number; variable: number; incentive: number; fixedTarget?: number; reimbursements?: number };
    financials?: {
        revenue: number;
        cost: number;
        profit: number;
        profitMargin: number;
    };
}

export default function SalaryAnalysisSection({ data }: { data: SalaryData }) {
    const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(val);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Salary Analysis</h2>
                {data.financials && (
                    <div className={`px-4 py-2 rounded-lg border ${data.financials.profit >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                        <span className="text-xs font-semibold uppercase tracking-wider block mb-1">Net Profit (Est.)</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black">{formatCurrency(data.financials.profit)}</span>
                            <span className="text-sm font-medium">({data.financials.profitMargin.toFixed(1)}%)</span>
                        </div>
                    </div>
                )}
            </div>

            {data.financials && (
                <Card>
                    <CardHeader>
                        <CardTitle>Profitability Health (Revenue vs Cost)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {/* Progress Bar Visual */}
                            <div className="relative h-12 bg-gray-100 rounded-full overflow-hidden flex">
                                <div
                                    className="bg-blue-500 h-full flex items-center justify-center text-white font-bold text-xs"
                                    style={{ width: `${Math.min((data.financials.revenue / (data.financials.revenue + data.financials.cost)) * 100, 100)}%` }}
                                >
                                    Revenue
                                </div>
                                <div
                                    className="bg-rose-500 h-full flex items-center justify-center text-white font-bold text-xs"
                                    style={{ width: `${Math.min((data.financials.cost / (data.financials.revenue + data.financials.cost)) * 100, 100)}%` }}
                                >
                                    Cost (Burn)
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                    <p className="text-xs text-blue-600 uppercase font-bold">Total Revenue</p>
                                    <p className="text-lg font-black text-blue-900">{formatCurrency(data.financials.revenue)}</p>
                                </div>
                                <div className="p-4 bg-rose-50 rounded-lg border border-rose-100 text-right">
                                    <p className="text-xs text-rose-600 uppercase font-bold">Annualized Burn</p>
                                    <p className="text-lg font-black text-rose-900">{formatCurrency(data.financials.cost)}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

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
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
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
                                            {formatCurrency(manager.totalExpenditure)}
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
                                <Tooltip
                                    formatter={(value: any, name: any, props: any) => {
                                        if (name === 'Fixed Salary' && props.payload.fixedTarget) {
                                            return [
                                                <div key="ft">
                                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)}
                                                    <div className="text-[10px] text-gray-200 mt-1">
                                                        (Quotas: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(props.payload.fixedTarget)})
                                                    </div>
                                                </div>,
                                                name
                                            ];
                                        }
                                        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
                                    }}
                                />
                                <Bar dataKey="fixed" name="Fixed Salary" stackId="a" fill="#3b82f6" radius={[4, 0, 0, 4]} />
                                <Bar dataKey="variable" name="Variable Pay" stackId="a" fill="#f59e0b" />
                                <Bar dataKey="incentive" name="Incentives" stackId="a" fill="#10b981" />
                                <Bar dataKey="reimbursements" name="Reimbursements" stackId="a" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
