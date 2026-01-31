
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import PerformanceEvaluationForm from '@/components/dashboard/hr/PerformanceEvaluationForm';
import PerformanceAnalysis from '@/components/dashboard/hr/PerformanceAnalysis';

export default function PerformanceDashboardPage() {
    const { data: session } = useSession();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'ANALYSIS' | 'EVALUATE'>('ANALYSIS');
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch employees logic
    useEffect(() => {
        async function fetchEmployees() {
            try {
                const res = await fetch('/api/hr/employees?hideSalary=true'); // Reusing existing endpoint
                if (res.ok) {
                    const data = await res.json();
                    setEmployees(data);
                    // Default to self if not manager/admin, or first employee if manager
                    // For now, let user select.
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchEmployees();
    }, []);

    const filteredEmployees = employees.filter(emp =>
        emp.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEvaluationSuccess = () => {
        setViewMode('ANALYSIS');
        // maybe trigger refresh of analysis
    };

    return (
        <div className="flex h-[calc(100vh-6rem)] gap-6">
            {/* Sidebar: Employee List */}
            <div className="w-1/3 min-w-[300px] bg-white rounded-2xl border border-secondary-100 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-secondary-100 bg-secondary-50">
                    <h2 className="font-bold text-secondary-900 mb-2">Team Members</h2>
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {loading ? (
                        <div className="p-4 text-center text-sm text-secondary-400">Loading team...</div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="p-4 text-center text-sm text-secondary-400">No employees found.</div>
                    ) : (
                        filteredEmployees.map(emp => (
                            <div
                                key={emp.id}
                                onClick={() => { setSelectedEmployee(emp.id); setViewMode('ANALYSIS'); }}
                                className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedEmployee === emp.id
                                        ? 'border-primary-200 bg-primary-50 shadow-sm'
                                        : 'border-transparent hover:bg-secondary-50'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-secondary-200 flex items-center justify-center text-xs font-bold text-secondary-600">
                                        {emp.user.name?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${selectedEmployee === emp.id ? 'text-primary-900' : 'text-secondary-900'}`}>
                                            {emp.user.name}
                                        </p>
                                        <p className="text-xs text-secondary-500">{emp.designation || 'No Designation'}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-white rounded-2xl border border-secondary-100 overflow-hidden flex flex-col">
                {selectedEmployee ? (
                    <>
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-secondary-900">
                                    {employees.find(e => e.id === selectedEmployee)?.user.name}
                                </h2>
                                <p className="text-sm text-secondary-500">Performance Overview</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setViewMode('ANALYSIS')}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${viewMode === 'ANALYSIS' ? 'bg-white shadow text-primary-600' : 'text-secondary-600 hover:bg-secondary-100'
                                        }`}
                                >
                                    Analysis
                                </button>
                                <button
                                    onClick={() => setViewMode('EVALUATE')}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${viewMode === 'EVALUATE' ? 'bg-primary-600 text-white shadow' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                                        }`}
                                >
                                    New Evaluation
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-secondary-50/30">
                            <AnimatePresence mode="wait">
                                {viewMode === 'ANALYSIS' ? (
                                    <motion.div
                                        key="analysis"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <PerformanceAnalysis employeeId={selectedEmployee} />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="evaluate"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <PerformanceEvaluationForm
                                            employeeId={selectedEmployee}
                                            employeeName={employees.find(e => e.id === selectedEmployee)?.user.name}
                                            period={new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
                                            periodType="MONTHLY"
                                            onSuccess={handleEvaluationSuccess}
                                            onCancel={() => setViewMode('ANALYSIS')}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-secondary-400">
                        <span className="text-4xl mb-4">📊</span>
                        <p>Select an employee to view performance details.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
