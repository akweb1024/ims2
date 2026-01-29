
"use client";

import FocusableModal from "@/components/ui/FocusableModal";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Loader2, Mail, Phone, MapPin, Building, Briefcase } from "lucide-react";

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

                        {/* Performance Snapshot */}
                        <div className="pt-4 border-t">
                            <h3 className="text-lg font-semibold mb-3">Performance & History</h3>
                            <p className="text-sm text-gray-500">Increment history and performance reviews would appear here.</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-4 text-red-500">Failed to load employee data.</div>
                )}
            </div>
        </FocusableModal>
    );
}
