
"use client";

import FocusableModal from "@/components/ui/FocusableModal";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Loader2, Mail, Phone, MapPin, Building, Briefcase, DollarSign, Target, PieChart as PieIcon } from "lucide-react";
import ExpenseImpactAnalytics from "@/components/dashboard/hr/ExpenseImpactAnalytics";

interface Employee360Props {
    employeeId: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function Employee360Modal({ employeeId, isOpen, onClose }: Employee360Props) {
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && employeeId) {
            setLoading(true);
            // Reusing the existing HR API which should be accessible to SUPER_ADMIN
            fetch(`/api/hr/employees/${employeeId}`)
                .then(res => res.json())
                .then(data => {
                    setEmployee(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch employee details", err);
                    setLoading(false);
                });
        }
    }, [employeeId, isOpen]);

    if (!isOpen) return null;



    return (
        <FocusableModal isOpen={isOpen} onClose={onClose} title="Employee 360° View" size="xl">
            <div className="max-h-[80vh] overflow-y-auto pr-2">

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="animate-spin h-8 w-8 text-primary" />
                    </div>
                ) : employee ? (
                    <div className="space-y-6">
                        {/* Header Profile */}
                        <div className="flex items-start gap-6 pb-6 border-b">
                            <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-3xl font-bold text-slate-500 uppercase">
                                {employee.user?.name?.substring(0, 2)}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold">{employee.user?.name}</h2>
                                <p className="text-gray-500">{employee.designatRef?.name || employee.designation || 'No Designation'}</p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <Badge variant="outline">{employee.employeeType}</Badge>
                                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{employee.user?.company?.name}</Badge>
                                    <Badge variant={employee.user?.isActive ? 'default' : 'destructive'}>
                                        {employee.user?.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Contact & Personal */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Contact Information</CardTitle></CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2"><Mail size={16} /> {employee.user?.email}</div>
                                    <div className="flex items-center gap-2"><Phone size={16} /> {employee.phoneNumber || 'N/A'}</div>
                                    <div className="flex items-center gap-2"><MapPin size={16} /> {employee.address || 'N/A'}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Employment Details</CardTitle></CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2"><Building size={16} /> Dept: {employee.user?.department?.name || 'N/A'}</div>
                                    <div className="flex items-center gap-2"><Briefcase size={16} /> Manager: {employee.user?.manager?.name || 'N/A'}</div>
                                    <div>Join Date: {employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : 'N/A'}</div>
                                    <div>CTC: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(employee.ctc || 0)}</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Financial History (If available) */}
                        {/* Keeping it simple for now, can perform more queries if needed */}

                        {/* Financial & Performance Suite */}
                        <div className="pt-6 border-t">
                            <h3 className="text-lg font-bold text-secondary-900 mb-4 flex items-center gap-2">
                                <DollarSign size={20} className="text-primary-600" />
                                Financial & Performance Suite
                            </h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Fixed Salary</p>
                                    <p className="text-xl font-black text-slate-900">₹{employee.salaryStructure?.salaryFixed?.toLocaleString() || '0'}</p>
                                </div>
                                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                    <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Variable Pay</p>
                                    <p className="text-xl font-black text-blue-700">₹{employee.salaryStructure?.salaryVariable?.toLocaleString() || '0'}</p>
                                </div>
                                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                                    <p className="text-[10px] font-black text-amber-500 uppercase mb-1">Incentives</p>
                                    <p className="text-xl font-black text-amber-700">₹{employee.salaryStructure?.salaryIncentive?.toLocaleString() || '0'}</p>
                                </div>
                                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">Perks/Exemp</p>
                                    <p className="text-xl font-black text-emerald-700">₹{(
                                        (employee.salaryStructure?.healthCare || 0) +
                                        (employee.salaryStructure?.travelling || 0) +
                                        (employee.salaryStructure?.mobile || 0) +
                                        (employee.salaryStructure?.internet || 0) +
                                        (employee.salaryStructure?.booksAndPeriodicals || 0)
                                    ).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Performance Targets Snapshot */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                                            <Target size={16} /> Latest Goal Progress
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {employee.goals && employee.goals.length > 0 ? (
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex justify-between items-end mb-1">
                                                        <p className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{employee.goals[0].title}</p>
                                                        <p className="text-xs font-black text-indigo-600">
                                                            {Math.min(100, Math.round((employee.goals[0].currentValue / employee.goals[0].targetValue) * 100))}%
                                                        </p>
                                                    </div>
                                                    <div className="w-full bg-indigo-100 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className="bg-indigo-600 h-full transition-all duration-500"
                                                            style={{ width: `${Math.min(100, (employee.goals[0].currentValue / employee.goals[0].targetValue) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                                        {employee.goals[0].currentValue} / {employee.goals[0].targetValue} {employee.goals[0].unit}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">No active targets found.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Expense Allocation Impact */}
                            <div className="mt-8 border-t pt-6">
                                <h3 className="text-lg font-bold text-secondary-900 mb-4 flex items-center gap-2">
                                    <PieIcon size={20} className="text-primary-600" />
                                    Departmental Expense Impact
                                </h3>
                                <ExpenseImpactAnalytics employeeId={employeeId} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-4 text-red-500">Failed to load employee data.</div>
                )}
            </div>
        </FocusableModal>
    );
}
