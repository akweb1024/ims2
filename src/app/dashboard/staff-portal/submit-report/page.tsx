'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Briefcase, Send, CheckCircle, Award, Settings, TrendingUp, Users, DollarSign, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function SubmitReportPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [savedReport, setSavedReport] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [existingReport, setExistingReport] = useState<any>(null);
    const [isCheckingExisting, setIsCheckingExisting] = useState(true);

    // Revenue Tracking State
    const [showRevenueSearch, setShowRevenueSearch] = useState(false);
    const [revenueSearch, setRevenueSearch] = useState('');
    const [revenueResults, setRevenueResults] = useState([]);
    const [searchingRevenue, setSearchingRevenue] = useState(false);
    const [selectedRevenueClaims, setSelectedRevenueClaims] = useState<any[]>([]);

    // Form State - Simplified to narrative only
    const [commonData, setCommonData] = useState({
        title: '',
        content: '',
        hoursSpent: 0,
        date: new Date().toISOString().split('T')[0],
        selfRating: 5,
        meetingsText: ''
    });

    const [prodActivity, setProdActivity] = useState<any>(null);

    const [availableTasks, setAvailableTasks] = useState<any[]>([]);
    const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
    const [scaledTaskValues, setScaledTaskValues] = useState<Record<string, number>>({});
    const [currentPoints, setCurrentPoints] = useState(0);
    const [taskValidationStatus, setTaskValidationStatus] = useState<Record<string, { isValid: boolean; message?: string }>>({});

    // Auto-calculated metrics from tasks
    const [derivedMetrics, setDerivedMetrics] = useState({
        revenue: 0,
        calls: 0,
        emails: 0,
        whatsapp: 0,
        invoices: 0,
        tasksCount: 0
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (userData) {
            const u = JSON.parse(userData);
            setUser(u);

            // Fetch Profile & Tasks
            fetch('/api/hr/profile/me', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(profile => {
                    if (profile) {
                        const depId = profile.department?.id || (u.departmentId);
                        const desId = profile.designationId;

                        const q = new URLSearchParams();
                        if (depId) q.append('departmentId', depId);
                        if (desId) q.append('designationId', desId);

                        fetch(`/api/hr/tasks?${q.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } })
                            .then(res => res.json())
                            .then(tasks => {
                                if (Array.isArray(tasks)) setAvailableTasks(tasks);
                            })
                            .catch(err => console.error("Error fetching tasks", err));
                    }
                });

            // Fetch today's attendance to calculate hours
            fetch('/api/hr/attendance', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => {
                    const today = new Date().toISOString().split('T')[0];
                    const record = data.find((a: any) => a.date.startsWith(today));
                    if (record && record.checkIn) {
                        const checkIn = new Date(record.checkIn);
                        const checkOut = record.checkOut ? new Date(record.checkOut) : new Date();
                        const diffMs = checkOut.getTime() - checkIn.getTime();
                        const hours = Math.round((diffMs / (1000 * 60 * 60)) * 2) / 2;
                        setCommonData(prev => ({ ...prev, hoursSpent: hours }));
                    }
                })
                .catch(err => console.error("Error fetching attendance", err));

            // Fetch production activity
            fetch('/api/production/my-activity', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => {
                    if (data.totalActions > 0) setProdActivity(data);
                })
                .catch(err => console.error("Error fetching activity", err));

            // Fetch today's completed tasks from Daily Task Tracker
            fetch('/api/hr/tasks/today-progress', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => {
                    if (data.completedTasks && Array.isArray(data.completedTasks)) {
                        // Pre-fill completed task IDs
                        const completedIds = data.completedTasks.map((ct: any) => ct.taskId);
                        setCompletedTaskIds(completedIds);

                        // Pre-fill quantities for scaled tasks
                        const quantities: Record<string, number> = {};
                        data.completedTasks.forEach((ct: any) => {
                            if (ct.quantity) {
                                quantities[ct.taskId] = ct.quantity;
                            }
                        });
                        setScaledTaskValues(quantities);

                        // Set current points
                        if (data.totalPoints) {
                            setCurrentPoints(data.totalPoints);
                        }

                        console.log('✅ Synced with Daily Task Tracker:', {
                            tasksCompleted: completedIds.length,
                            pointsEarned: data.totalPoints
                        });
                    }
                })
                .catch(err => console.error("Error syncing with Daily Task Tracker", err));

            // Check if a report already exists for today
            const todayStr = new Date().toISOString().split('T')[0];
            fetch(`/api/hr/work-reports?employeeId=self&startDate=${todayStr}&endDate=${todayStr}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(reports => {
                    if (Array.isArray(reports) && reports.length > 0) {
                        const report = reports[0];
                        console.log('📝 Found existing report for today:', report);
                        setExistingReport(report);
                        setIsEditMode(true);

                        // Load data from existing report
                        setCommonData({
                            title: report.title || '',
                            content: report.content || '',
                            hoursSpent: report.hoursSpent || 0,
                            date: report.date ? new Date(report.date).toISOString().split('T')[0] : todayStr,
                            selfRating: report.selfRating || 5,
                            meetingsText: report.metrics?.meetingsText || ''
                        });

                        // Note: Task IDs are already pre-filled from Daily Task Tracker 
                        // but if they were different in the report, we might want to sync them.
                        // However, the rule is to sync from Task Tracker for the daily flow.
                        if (report.completedTaskIds && report.completedTaskIds.length > 0) {
                            setCompletedTaskIds(report.completedTaskIds);
                        }
                    }
                })
                .catch(err => console.error("Error checking existing report", err))
                .finally(() => setIsCheckingExisting(false));
        }
    }, []);

    // Calculate points and derive metrics from tasks with validation
    useEffect(() => {
        let points = 0;
        let revenue = 0;
        let calls = 0;
        let emails = 0;
        let whatsapp = 0;
        let invoices = 0;
        const validationStatus: Record<string, { isValid: boolean; message?: string }> = {};

        // Initialize validation status for all completed tasks
        completedTaskIds.forEach(id => {
            validationStatus[id] = { isValid: true }; // Default to true until proven otherwise
        });

        availableTasks.forEach(t => {
            if (completedTaskIds.includes(t.id)) {
                // Calculate points and validate
                if (t.calculationType === 'SCALED') {
                    const quantity = scaledTaskValues[t.id] || 0;

                    // Validation for scaled tasks
                    if (quantity === 0) {
                        validationStatus[t.id] = {
                            isValid: false,
                            message: 'Please enter quantity'
                        };
                        return;
                    }

                    if (t.minThreshold && quantity < t.minThreshold) {
                        validationStatus[t.id] = {
                            isValid: false,
                            message: `Minimum ${t.minThreshold} units required`
                        };
                        return;
                    }

                    // Task is valid
                    validationStatus[t.id] = { isValid: true };

                    const effQuantity = (t.maxThreshold && quantity > t.maxThreshold) ? t.maxThreshold : quantity;
                    const taskPoints = effQuantity * (t.pointsPerUnit || 0);
                    points += taskPoints;

                    // Derive metrics based on task title/description keywords
                    const titleLower = t.title.toLowerCase();
                    if (titleLower.includes('revenue') || titleLower.includes('sales')) {
                        revenue += quantity;
                    }
                    if (titleLower.includes('call')) {
                        calls += quantity;
                    }
                    if (titleLower.includes('email') || titleLower.includes('mail')) {
                        emails += quantity;
                    }
                    if (titleLower.includes('whatsapp') || titleLower.includes('chat')) {
                        whatsapp += quantity;
                    }
                    if (titleLower.includes('invoice')) {
                        invoices += quantity;
                    }
                } else {
                    // Flat tasks are always valid when checked
                    validationStatus[t.id] = { isValid: true };
                    points += t.points;
                }
            }
        });

        setTaskValidationStatus(validationStatus);
        setCurrentPoints(Math.floor(points));
        setDerivedMetrics({
            revenue,
            calls,
            emails,
            whatsapp,
            invoices,
            tasksCount: completedTaskIds.length
        });
    }, [completedTaskIds, availableTasks, scaledTaskValues]);

    // Revenue Search Logic
    const searchRevenueTransactions = async (query: string) => {
        if (!query || query.length < 2) {
            setRevenueResults([]);
            return;
        }
        setSearchingRevenue(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/revenue/transactions?status=PENDING&method=ALL`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Client side filtering for better UX with small dataset
                const filtered = data.filter((t: any) =>
                    t.customerName?.toLowerCase().includes(query.toLowerCase()) ||
                    t.transactionNumber?.toLowerCase().includes(query.toLowerCase()) ||
                    t.referenceNumber?.toLowerCase().includes(query.toLowerCase())
                );
                setRevenueResults(filtered);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSearchingRevenue(false);
        }
    };

    const addRevenueClaim = (rt: any) => {
        if (selectedRevenueClaims.some(c => c.transactionId === rt.id)) {
            toast.error('Transaction already selected');
            return;
        }
        setSelectedRevenueClaims(prev => [...prev, {
            transactionId: rt.id,
            transactionNumber: rt.transactionNumber,
            customerName: rt.customerName,
            amount: rt.amount,
            reason: ''
        }]);
        setRevenueSearch('');
        setRevenueResults([]);
        setShowRevenueSearch(false);
        toast.success('Revenue linked to report');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('🚀 Submit Report Triggered');

        // Validate all completed tasks
        const invalidTasks = completedTaskIds.filter(taskId => {
            const task = availableTasks.find(t => t.id === taskId);
            if (!task) return false; // Skip validation for tasks we don't have metadata for locally

            const validation = taskValidationStatus[taskId];
            return validation && !validation.isValid;
        });

        if (invalidTasks.length > 0) {
            console.warn('⚠️ Validation failed for tasks:', invalidTasks);
            const invalidTaskNames = invalidTasks.map(id => {
                const task = availableTasks.find(t => t.id === id);
                return task?.title || 'Unknown task';
            }).join(', ');

            toast.error(`Please fix validation errors for: ${invalidTaskNames}`);
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            console.log('📦 Preparing payload...');

            const payload: any = {
                ...commonData,
                category: 'TASK_BASED',
                userRole: user?.role,
                revenueGenerated: derivedMetrics.revenue + selectedRevenueClaims.reduce((sum, c) => sum + c.amount, 0),
                tasksCompleted: derivedMetrics.tasksCount,
                completedTaskIds,
                taskQuantities: scaledTaskValues,
                chatsHandled: derivedMetrics.whatsapp,
                followUpsCompleted: derivedMetrics.calls,
                revenueClaims: selectedRevenueClaims.map(c => ({
                    transactionId: c.transactionId,
                    amount: c.amount,
                    reason: c.reason
                })),
                metrics: {
                    derived: derivedMetrics,
                    meetingsText: commonData.meetingsText
                }
            };

            if (isEditMode && existingReport) {
                payload.id = existingReport.id;
            }

            console.log(`📡 Sending request to /api/hr/work-reports (${isEditMode ? 'PUT' : 'POST'})...`, payload);

            const res = await fetch('/api/hr/work-reports', {
                method: isEditMode ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                console.log(`✅ Report ${isEditMode ? 'updated' : 'submitted'} successfully`);
                setSavedReport(true);
                setTimeout(() => router.push('/dashboard/staff-portal'), 2000);
            } else {
                const error = await res.json();
                console.error('❌ Server error:', error);

                if (error.error === 'DUPLICATE_REPORT') {
                    toast.error('You have already submitted a report for today. Switching to Edit mode...');
                    setIsEditMode(true);
                    if (error.reportId) {
                        // Refresh to load that report or handle locally
                        window.location.reload();
                    }
                } else {
                    toast.error(error.error || `Failed to ${isEditMode ? 'update' : 'submit'} report`);
                }
            }
        } catch (error) {
            console.error('💥 Submission crash:', error);
            toast.error(`Error ${isEditMode ? 'updating' : 'submitting'} report`);
        } finally {
            setLoading(false);
        }
    };

    if (savedReport) {
        return (
            <DashboardLayout userRole={user?.role}>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <div className="w-24 h-24 bg-success-100 text-success-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                        <CheckCircle size={48} />
                    </div>
                    <h1 className="text-3xl font-black text-secondary-900 mb-2">Report Submitted!</h1>
                    <p className="text-secondary-500">Your work report has been logged successfully.</p>
                    {currentPoints > 0 && (
                        <div className="mt-4 p-4 bg-primary-50 rounded-xl border border-primary-100">
                            <p className="text-sm font-bold text-primary-800">🎉 Points Submitted (Pending Approval)</p>
                            <p className="text-4xl font-black text-primary-600">+{currentPoints}</p>
                        </div>
                    )}
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout userRole={user?.role}>
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">
                            {isEditMode ? 'Update Work Report' : 'Submit Work Report'}
                        </h1>
                        <p className="text-secondary-500">
                            {isEditMode ? 'Modifying your submission for today' : 'Track your daily impact through task completion'}
                        </p>
                    </div>
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-2xl shadow-lg">
                        <span className="text-xs font-bold uppercase tracking-wider block">Today&apos;s Score</span>
                        <div className="text-3xl font-black">{currentPoints} <span className="text-sm">pts</span></div>
                    </div>
                </div>

                {/* Edit Restriction Notice */}
                {isEditMode && existingReport && (
                    <div className={`p-4 rounded-xl border-l-4 ${existingReport.status !== 'SUBMITTED'
                        ? 'bg-amber-50 border-amber-500 text-amber-900'
                        : 'bg-blue-50 border-blue-500 text-blue-900'
                        }`}>
                        <div className="flex items-center gap-3">
                            <Briefcase size={24} />
                            <div>
                                <h4 className="font-bold">
                                    {existingReport.status !== 'SUBMITTED'
                                        ? '📝 Report Under Review / Approved'
                                        : '📝 Editing Today\'s Report'}
                                </h4>
                                <p className="text-sm opacity-90">
                                    {existingReport.status !== 'SUBMITTED'
                                        ? 'This report has already been reviewed or approved and cannot be modified.'
                                        : 'You have already submitted a report for today. You can update your submission until it is reviewed by a manager.'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sync Indicator */}
                {completedTaskIds.length > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 rounded-xl">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="text-green-600" size={24} />
                            <div>
                                <h4 className="font-bold text-green-900">✨ Auto-Synced from Daily Task Tracker</h4>
                                <p className="text-sm text-green-700">
                                    {completedTaskIds.length} task{completedTaskIds.length !== 1 ? 's' : ''} automatically loaded from your daily checklist.
                                    You can modify or add more tasks below.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Auto-Calculated Metrics Display */}
                {derivedMetrics.tasksCount > 0 && (
                    <div className="card-premium p-6 bg-gradient-to-br from-primary-50 to-indigo-50 border-t-4 border-indigo-500">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="text-indigo-600" size={24} />
                            <h3 className="font-bold text-lg text-secondary-900">Auto-Calculated Metrics</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {derivedMetrics.revenue > 0 && (
                                <div className="bg-white/80 p-4 rounded-xl text-center">
                                    <p className="text-xs font-bold text-secondary-400 uppercase">Revenue</p>
                                    <p className="text-2xl font-black text-success-600">₹{derivedMetrics.revenue.toLocaleString()}</p>
                                </div>
                            )}
                            {derivedMetrics.calls > 0 && (
                                <div className="bg-white/80 p-4 rounded-xl text-center">
                                    <p className="text-xs font-bold text-secondary-400 uppercase">Calls</p>
                                    <p className="text-2xl font-black text-primary-600">{derivedMetrics.calls}</p>
                                </div>
                            )}
                            {derivedMetrics.emails > 0 && (
                                <div className="bg-white/80 p-4 rounded-xl text-center">
                                    <p className="text-xs font-bold text-secondary-400 uppercase">Emails</p>
                                    <p className="text-2xl font-black text-indigo-600">{derivedMetrics.emails}</p>
                                </div>
                            )}
                            {derivedMetrics.invoices > 0 && (
                                <div className="bg-white/80 p-4 rounded-xl text-center">
                                    <p className="text-xs font-bold text-secondary-400 uppercase">Invoices</p>
                                    <p className="text-2xl font-black text-warning-600">{derivedMetrics.invoices}</p>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-indigo-600 mt-4 italic text-center">✨ Metrics automatically calculated from your task checklist</p>
                    </div>
                )}

                {/* Gamified Task Checklist */}
                {availableTasks.length > 0 && (
                    <div className="card-premium p-6 border-t-4 border-indigo-500">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg flex items-center gap-2 text-secondary-900">
                                <Award size={24} className="text-indigo-600" />
                                Daily Task Checklist
                            </h3>
                            <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Completed</span>
                                <div className="text-2xl font-black text-indigo-700">{completedTaskIds.length}/{availableTasks.length}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {availableTasks.map(task => {
                                const isCompleted = completedTaskIds.includes(task.id);
                                const validation = taskValidationStatus[task.id];
                                const isValid = validation?.isValid ?? true;
                                const hasError = isCompleted && !isValid;

                                // Calculate current points for this task
                                let taskPoints = 0;
                                if (isCompleted) {
                                    if (task.calculationType === 'SCALED') {
                                        const qty = scaledTaskValues[task.id] || 0;
                                        const effQty = (task.maxThreshold && qty > task.maxThreshold) ? task.maxThreshold : qty;
                                        if (!task.minThreshold || qty >= task.minThreshold) {
                                            taskPoints = effQty * (task.pointsPerUnit || 0);
                                        }
                                    } else {
                                        taskPoints = task.points;
                                    }
                                }

                                return (
                                    <div
                                        key={task.id}
                                        onClick={(e) => {
                                            if ((e.target as HTMLElement).tagName === 'INPUT') return;

                                            if (isCompleted) {
                                                setCompletedTaskIds(prev => prev.filter(id => id !== task.id));
                                            } else {
                                                setCompletedTaskIds(prev => [...prev, task.id]);
                                            }
                                        }}
                                        className={`
                                            group relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                                            ${hasError
                                                ? 'bg-danger-50/30 border-danger-400 shadow-md'
                                                : isCompleted && isValid
                                                    ? 'bg-success-50/30 border-success-500 shadow-md'
                                                    : isCompleted
                                                        ? 'bg-indigo-50/50 border-indigo-500 shadow-md'
                                                        : 'bg-white border-secondary-100 hover:border-indigo-200 hover:shadow-sm'
                                            }
                                        `}
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            <div className={`
                                                w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                                                ${hasError
                                                    ? 'bg-danger-500 border-danger-500 text-white'
                                                    : isCompleted && isValid
                                                        ? 'bg-success-500 border-success-500 text-white'
                                                        : isCompleted
                                                            ? 'bg-indigo-500 border-indigo-500 text-white'
                                                            : 'border-secondary-300 group-hover:border-indigo-400'
                                                }
                                            `}>
                                                {isCompleted && <CheckCircle size={14} />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h4 className={`font-bold text-sm leading-tight mb-1 ${hasError ? 'text-danger-900' :
                                                        isCompleted && isValid ? 'text-success-900' :
                                                            isCompleted ? 'text-indigo-900' : 'text-secondary-700'
                                                        }`}>
                                                        {task.title}
                                                    </h4>
                                                    <div className="flex flex-col items-end gap-1">
                                                        {task.calculationType === 'SCALED' ? (
                                                            <span className="badge bg-purple-100 text-purple-700 text-[10px] font-black whitespace-nowrap">
                                                                {task.pointsPerUnit < 1
                                                                    ? `1pt/${Math.round(1 / task.pointsPerUnit)}u`
                                                                    : `${task.pointsPerUnit}pt/u`
                                                                }
                                                            </span>
                                                        ) : (
                                                            <span className="badge bg-indigo-100 text-indigo-700 text-[10px] font-black">{task.points} pts</span>
                                                        )}
                                                        {isCompleted && taskPoints > 0 && (
                                                            <span className="text-[10px] font-black text-success-600">
                                                                +{Math.floor(taskPoints)} pts
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {task.description && <p className="text-xs text-secondary-500 leading-relaxed mb-2">{task.description}</p>}

                                                {task.calculationType === 'SCALED' && (
                                                    <div className="mt-2 space-y-2" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                className={`input py-1 h-8 text-sm w-24 ${hasError ? 'border-danger-400 focus:border-danger-500' : ''
                                                                    }`}
                                                                placeholder="Qty"
                                                                min="0"
                                                                value={scaledTaskValues[task.id] || ''}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    setScaledTaskValues(prev => ({ ...prev, [task.id]: val }));

                                                                    if (val > 0 && !isCompleted) {
                                                                        setCompletedTaskIds(prev => [...prev, task.id]);
                                                                    }
                                                                }}
                                                            />
                                                            <div className="flex-1">
                                                                <span className="text-xs text-secondary-600 font-medium">
                                                                    {task.minThreshold > 1 ? `Min: ${task.minThreshold}` : 'units'}
                                                                    {task.maxThreshold && ` • Max: ${task.maxThreshold}`}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Validation Message */}
                                                        {hasError && validation?.message && (
                                                            <div className="flex items-center gap-1 text-danger-600 bg-danger-50 px-2 py-1 rounded-lg animate-in fade-in slide-in-from-top duration-200">
                                                                <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                </svg>
                                                                <span className="text-[10px] font-bold">{validation.message}</span>
                                                            </div>
                                                        )}

                                                        {/* Success indicator for valid scaled tasks */}
                                                        {isCompleted && isValid && scaledTaskValues[task.id] > 0 && (
                                                            <div className="flex items-center gap-1 text-success-600 bg-success-50 px-2 py-1 rounded-lg">
                                                                <CheckCircle className="w-3 h-3 shrink-0" />
                                                                <span className="text-[10px] font-bold">
                                                                    Valid • {scaledTaskValues[task.id]} units = {Math.floor(taskPoints)} points
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Content - Left Col */}
                    <div className="md:col-span-2 space-y-6">

                        <div className="card-premium p-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-secondary-900">
                                <Briefcase size={20} className="text-primary-600" />
                                Work Summary
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="label">Focus Title</label>
                                    <input required className="input" placeholder="e.g. Client Outreach & Follow-ups"
                                        value={commonData.title} onChange={e => setCommonData({ ...commonData, title: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Date</label>
                                        <input
                                            type="date"
                                            title="Report Date"
                                            required
                                            className={`input ${isEditMode ? 'bg-secondary-50 cursor-not-allowed' : ''}`}
                                            value={commonData.date}
                                            readOnly={isEditMode}
                                            onChange={e => !isEditMode && setCommonData({ ...commonData, date: e.target.value })}
                                        />
                                        {isEditMode && <p className="text-[10px] text-secondary-400 mt-1">Date cannot be changed once submitted</p>}
                                    </div>
                                    <div>
                                        <label className="label">Hours Spent</label>
                                        <input type="number" step="0.5" title="Hours Spent" required className="input"
                                            value={commonData.hoursSpent} onChange={e => setCommonData({ ...commonData, hoursSpent: parseFloat(e.target.value) })} />
                                    </div>
                                </div>

                                {prodActivity && (
                                    <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 animate-in fade-in slide-in-from-bottom duration-500">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-xs font-black text-primary-700 uppercase tracking-wider flex items-center gap-2">
                                                <Settings size={14} className="animate-spin-slow" />
                                                Synced Publication Work
                                            </h4>
                                            <span className="badge badge-primary">{prodActivity.totalActions} Actions</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/50 p-2 rounded-lg text-center">
                                                <p className="text-[10px] font-bold text-secondary-500 uppercase">Manuscripts</p>
                                                <p className="text-lg font-black text-primary-600">{prodActivity.articles}</p>
                                            </div>
                                            <div className="bg-white/50 p-2 rounded-lg text-center">
                                                <p className="text-[10px] font-bold text-secondary-500 uppercase">Issues</p>
                                                <p className="text-lg font-black text-primary-600">{prodActivity.issues}</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-primary-400 mt-2 italic text-center">These activities will be automatically appended to your report summary.</p>
                                    </div>
                                )}

                                <div>
                                    <label className="label">Detailed Content</label>
                                    <textarea required rows={5} className="input" placeholder="Describe your activities..."
                                        value={commonData.content} onChange={e => setCommonData({ ...commonData, content: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        {/* Revenue Claims Section */}
                        <div className="card-premium p-6 border-t-4 border-success-500">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-secondary-900">
                                <DollarSign size={20} className="text-success-600" />
                                Revenue Attribution
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-sm text-secondary-500">Did you generate or collect any revenue today?</p>
                                    <button
                                        type="button"
                                        onClick={() => setShowRevenueSearch(!showRevenueSearch)}
                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${showRevenueSearch ? 'bg-danger-50 text-danger-600' : 'bg-success-50 text-success-600'
                                            }`}
                                    >
                                        {showRevenueSearch ? 'Hide Search' : 'Link Transaction'}
                                    </button>
                                </div>

                                {showRevenueSearch && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top duration-300">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                            <input
                                                type="text"
                                                className="input pl-10 h-10 text-sm"
                                                placeholder="Search by Customer name, RT#, or Reference..."
                                                value={revenueSearch}
                                                onChange={(e) => {
                                                    setRevenueSearch(e.target.value);
                                                    searchRevenueTransactions(e.target.value);
                                                }}
                                            />
                                        </div>

                                        <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-secondary-50 rounded-xl border border-secondary-200">
                                            {searchingRevenue ? (
                                                <div className="text-center py-4"><span className="animate-spin inline-block w-4 h-4 border-b-2 border-primary-600 rounded-full"></span></div>
                                            ) : revenueResults.length === 0 ? (
                                                <p className="text-center py-4 text-xs text-secondary-400">No matching verified transactions found</p>
                                            ) : (
                                                revenueResults.map((rt: any) => (
                                                    <div
                                                        key={rt.id}
                                                        onClick={() => addRevenueClaim(rt)}
                                                        className="flex justify-between items-center p-3 bg-white rounded-lg border border-secondary-100 hover:border-success-400 cursor-pointer transition-all"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-bold text-secondary-900">{rt.customerName}</p>
                                                            <p className="text-[10px] text-secondary-500 uppercase">{rt.transactionNumber} • {rt.paymentMethod}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-black text-success-600">₹{rt.amount.toLocaleString()}</p>
                                                            <p className="text-[10px] text-secondary-400">{new Date(rt.paymentDate).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Selected Claims */}
                                {selectedRevenueClaims.length > 0 && (
                                    <div className="space-y-3 mt-4">
                                        <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Selected for this Report</p>
                                        {selectedRevenueClaims.map((claim: any) => (
                                            <div key={claim.transactionId} className="flex items-center gap-3 p-4 bg-success-50 rounded-2xl border border-success-200 shadow-sm animate-in zoom-in duration-200">
                                                <div className="p-2 bg-white rounded-xl text-success-600 shadow-sm">
                                                    <CheckCircle size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-sm font-black text-secondary-900">{claim.customerName}</span>
                                                        <span className="text-sm font-black text-success-700">₹{claim.amount.toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-[10px] text-secondary-500 uppercase font-bold">{claim.transactionNumber} • Verified Source</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedRevenueClaims(prev => prev.filter((c: any) => c.transactionId !== claim.transactionId))}
                                                    className="p-2 text-danger-400 hover:text-danger-600 hover:bg-danger-50 rounded-xl"
                                                    title="Remove Selected Claim"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Meetings Section */}
                        <div className="card-premium p-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-secondary-900">
                                <Users size={20} className="text-indigo-600" />
                                Key Meetings (Optional)
                            </h3>
                            <textarea className="input" rows={3} placeholder='e.g., Meeting with Client X at 10AM (Result: Deal Closed)'
                                value={commonData.meetingsText} onChange={e => setCommonData({ ...commonData, meetingsText: e.target.value })} />
                            <p className="text-[10px] text-secondary-400 mt-1">Format: Time, With Whom, Result</p>
                        </div>
                    </div>

                    {/* Right Col - Self Rating & Submit */}
                    <div className="space-y-6">
                        <div className="card-premium p-6 border-t-4 border-warning-500">
                            <h3 className="font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2 text-secondary-900">
                                <Award size={16} className="text-warning-600" />
                                Self Rating
                            </h3>
                            <div className="space-y-3">
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    className="w-full"
                                    value={commonData.selfRating}
                                    onChange={e => setCommonData({ ...commonData, selfRating: parseInt(e.target.value) })}
                                    title="Self Rating Range"
                                />
                                <div className="flex justify-between text-xs font-bold text-secondary-400">
                                    <span>Poor</span>
                                    <span className="text-2xl text-warning-600">{commonData.selfRating}/10</span>
                                    <span>Excellent</span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || (isEditMode && existingReport?.status !== 'SUBMITTED')}
                            className={`btn w-full py-4 text-lg font-black shadow-xl transition-all ${isEditMode && existingReport?.status !== 'SUBMITTED'
                                ? 'bg-secondary-200 text-secondary-400 cursor-not-allowed shadow-none'
                                : 'btn-primary hover:shadow-primary-200'
                                }`}
                        >
                            {loading
                                ? 'Processing...'
                                : isEditMode
                                    ? 'Update Report'
                                    : 'Submit Report'}
                            <Send size={18} className="inline ml-2" />
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
