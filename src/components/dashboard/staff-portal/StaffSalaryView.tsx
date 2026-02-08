import { TrendingUp, Target, Shield, Activity, ClipboardList, Award } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';
import PerformanceProgressBar from '@/components/common/PerformanceProgressBar';

interface StaffSalaryViewProps {
    fullProfile: any;
    salarySlips: any[];
    activeIncrement?: any;
}

export default function StaffSalaryView({ fullProfile, salarySlips, activeIncrement }: StaffSalaryViewProps) {
    if (!fullProfile) return null;

    const handleDownloadSlip = async (slip: any) => {
        const token = localStorage.getItem('token');
        const btn = document.getElementById(`download-btn-${slip.id}`);
        if (btn) btn.innerHTML = 'Downloading...';
        try {
            const res = await fetch(`/api/hr/salary-slips/${slip.id}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Salary_Slip_${slip.month}_${slip.year}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                alert('Failed to download salary slip');
            }
        } catch (error) {
            console.error('Download error:', error);
            alert('An error occurred while downloading.');
        } finally {
            if (btn) btn.innerHTML = 'Download PDF';
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-8">
                {/* Current Salary Structure */}
                <div className="card-premium p-8 bg-gradient-to-br from-primary-900 to-secondary-900 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="relative z-10">
                        <h3 className="font-bold text-primary-200 uppercase tracking-widest text-sm mb-6">Current Salary Structure</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div>
                                <p className="text-secondary-400 text-xs font-bold uppercase mb-1">Base Salary (Annual)</p>
                                <p className="text-2xl font-black">₹{(fullProfile.baseSalary || 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-secondary-400 text-xs font-bold uppercase mb-1">Variable Pay</p>
                                <p className="text-2xl font-black text-primary-300">₹{(fullProfile.variableSalary || 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-secondary-400 text-xs font-bold uppercase mb-1">Incentive Target</p>
                                <p className="text-2xl font-black text-success-300">₹{((fullProfile.monthlyTarget || 0) * 12).toLocaleString()}</p>
                                <span className="text-[10px] opacity-70">Annualized target based on monthly</span>
                            </div>
                            <div>
                                <p className="text-secondary-400 text-xs font-bold uppercase mb-1">Total CTC</p>
                                <p className="text-3xl font-black text-white">₹{((fullProfile.baseSalary || 0) + (fullProfile.variableSalary || 0)).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Performance & Active Targets */}
                {activeIncrement && (() => {
                    const monthlyReviews = activeIncrement.reviews?.filter((r: any) => r.type === 'MONTHLY') || [];
                    const currentMonth = new Date().getMonth() + 1;
                    const currentYear = new Date().getFullYear();

                    // Monthly Target and Achievement (Latest found)
                    const latestMonthReview = monthlyReviews[0]; // Already ordered by date desc in API
                    const monthlyTarget = activeIncrement.newMonthlyTarget || 0;
                    const monthlyAchieved = latestMonthReview?.revenueAchievement || 0;

                    // Quarterly Aggregation (Current Quarter)
                    const currentQ = Math.floor((currentMonth - 1) / 3) + 1;
                    const qMonths = currentQ === 1 ? [1, 2, 3] : currentQ === 2 ? [4, 5, 6] : currentQ === 3 ? [7, 8, 9] : [10, 11, 12];
                    const qReviews = monthlyReviews.filter((r: any) => qMonths.includes(r.month) && r.year === currentYear);
                    const qAchieved = qReviews.reduce((sum: number, r: any) => sum + (r.revenueAchievement || 0), 0);

                    // Calculate Q Target (Sum of monthly targets if available, else monthlyTarget * 3)
                    const monthlyTargetsJson = activeIncrement.monthlyTargets as any;
                    let qTarget = 0;
                    if (monthlyTargetsJson) {
                        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                        qMonths.forEach(m => {
                            qTarget += (monthlyTargetsJson[monthNames[m - 1]] || monthlyTarget);
                        });
                    } else {
                        qTarget = monthlyTarget * 3;
                    }

                    // Yearly Aggregation (Current Fiscal/Calendar Year)
                    const yearlyAchieved = monthlyReviews.filter((r: any) => r.year === currentYear).reduce((sum: number, r: any) => sum + (r.revenueAchievement || 0), 0);
                    const yearlyTarget = activeIncrement.newYearlyTarget || (monthlyTarget * 12);

                    return (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 card-premium p-8 space-y-8">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-black text-secondary-900 flex items-center gap-3 text-lg">
                                            <Target className="text-primary-600" size={24} />
                                            Active Performance Metrics
                                        </h3>
                                        <span className="bg-primary-50 text-primary-700 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider border border-primary-100 italic">
                                            FY{activeIncrement.fiscalYear} Target Cycle
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <PerformanceProgressBar
                                            label="Monthly"
                                            target={monthlyTarget}
                                            current={monthlyAchieved}
                                            unit="₹"
                                        />
                                        <PerformanceProgressBar
                                            label="Quarterly (Q{currentQ})"
                                            target={qTarget}
                                            current={qAchieved}
                                            unit="₹"
                                            color="bg-indigo-500"
                                        />
                                        <PerformanceProgressBar
                                            label="Yearly"
                                            target={yearlyTarget}
                                            current={yearlyAchieved}
                                            unit="₹"
                                            color="bg-success-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-secondary-100">
                                        <div className="p-6 bg-secondary-50 rounded-[2rem] border border-secondary-100">
                                            <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Shield size={14} className="text-primary-500" /> Current KRA
                                            </h4>
                                            <p className="text-xs text-secondary-700 leading-relaxed italic whitespace-pre-wrap">
                                                {activeIncrement.newKRA || 'Standard KRA policy active.'}
                                            </p>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest flex items-center gap-2">
                                                <Activity size={14} className="text-warning-500" /> Performance Breakdown
                                            </h4>
                                            <div className="bg-white rounded-2xl border border-secondary-100 overflow-hidden">
                                                <table className="w-full text-[10px]">
                                                    <thead className="bg-secondary-50">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left font-black text-secondary-500 uppercase">Month</th>
                                                            <th className="px-3 py-2 text-right font-black text-secondary-500 uppercase">Achieved</th>
                                                            <th className="px-3 py-2 text-right font-black text-secondary-500 uppercase">%</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-secondary-50">
                                                        {monthlyReviews.slice(0, 4).map((r: any) => {
                                                            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                                            const mTarget = monthlyTargetsJson ? (monthlyTargetsJson[Object.keys(monthlyTargetsJson)[r.month - 1]] || monthlyTarget) : monthlyTarget;
                                                            const perc = mTarget > 0 ? (r.revenueAchievement / mTarget) * 100 : 0;
                                                            return (
                                                                <tr key={r.id}>
                                                                    <td className="px-3 py-2 font-bold text-secondary-700">{monthNames[r.month - 1]} {r.year}</td>
                                                                    <td className="px-3 py-2 text-right font-black text-secondary-900">₹{r.revenueAchievement.toLocaleString()}</td>
                                                                    <td className={`px-3 py-2 text-right font-black ${perc >= 100 ? 'text-success-600' : perc >= 70 ? 'text-primary-600' : 'text-warning-600'}`}>
                                                                        {perc.toFixed(0)}%
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {monthlyReviews.length === 0 && (
                                                            <tr>
                                                                <td colSpan={3} className="px-3 py-4 text-center text-secondary-400 italic">No monthly data available</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-premium p-8 bg-secondary-50 border-secondary-100 space-y-6">
                                    <h3 className="font-black text-secondary-900 flex items-center gap-3 text-lg">
                                        <ClipboardList className="text-indigo-600" size={24} />
                                        Review History
                                    </h3>
                                    <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                                        {activeIncrement.reviews?.map((review: any) => (
                                            <div key={review.id} className="bg-white p-4 rounded-2xl border border-secondary-100 shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">{review.period} - {review.type}</span>
                                                    <span className="text-[9px] text-secondary-400 font-bold"><FormattedDate date={review.date} /></span>
                                                </div>
                                                <p className="text-xs text-secondary-700 line-clamp-2 italic mb-3">&ldquo;{review.comments || 'No comments provided'}&rdquo;</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-5 w-5 rounded-full bg-secondary-100 flex items-center justify-center text-[10px] text-secondary-600 font-bold">
                                                        {review.reviewer?.name?.[0]}
                                                    </div>
                                                    <span className="text-[9px] font-black text-secondary-500 uppercase">{review.reviewer?.name}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {(!activeIncrement.reviews || activeIncrement.reviews.length === 0) && (
                                            <div className="text-center py-10">
                                                <Award size={32} className="text-secondary-200 mx-auto mb-2" />
                                                <p className="text-xs text-secondary-400 font-medium">No performance reviews recorded for this increment yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Increment History */}
            {fullProfile.incrementHistory?.length > 0 && (
                <div className="card-premium overflow-hidden">
                    <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/30">
                        <h3 className="font-bold text-secondary-900 flex items-center gap-2">
                            <TrendingUp size={18} className="text-primary-600" />
                            Increment History
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th className="text-right">Previous</th>
                                    <th className="text-right">Revised</th>
                                    <th className="text-right">Change</th>
                                    <th className="text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fullProfile.incrementHistory.map((rec: any) => (
                                    <tr key={rec.id}>
                                        <td className="font-medium"><FormattedDate date={rec.effectiveDate} /></td>
                                        <td><span className="badge badge-secondary">{rec.type}</span></td>
                                        <td className="text-right text-secondary-500">₹{rec.oldSalary.toLocaleString()}</td>
                                        <td className="text-right font-bold text-secondary-900">₹{rec.newSalary.toLocaleString()}</td>
                                        <td className="text-right">
                                            <span className={`font-bold ${rec.percentage >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                                                {rec.percentage > 0 ? '+' : ''}{rec.percentage}%
                                            </span>
                                        </td>
                                        <td className="text-right"><span className="badge badge-success">{rec.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Salary Slips */}
            <div>
                <h3 className="font-bold text-lg text-secondary-900 mb-4">Salary Slips</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {salarySlips.map(slip => (
                        <div key={slip.id} className="card-premium p-6 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-success-100 text-success-600 rounded-xl flex items-center justify-center text-xl">
                                    💵
                                </div>
                                <div>
                                    <p className="font-bold text-secondary-900">Salary Slip - {['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][slip.month] || slip.month} {slip.year}</p>
                                    <p className="text-xs text-secondary-500">Paid on <FormattedDate date={slip.generatedAt} /></p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-secondary-900">₹{slip.amountPaid.toLocaleString()}</p>
                                <button
                                    onClick={() => handleDownloadSlip(slip)}
                                    id={`download-btn-${slip.id}`}
                                    className="text-[10px] font-bold text-primary-600 uppercase tracking-widest hover:underline mt-1"
                                >
                                    Download PDF
                                </button>
                            </div>
                        </div>
                    ))}
                    {salarySlips.length === 0 && (
                        <div className="col-span-full py-20 text-center card-premium">
                            <p className="text-secondary-500 tracking-wide">No salary slips generated yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
