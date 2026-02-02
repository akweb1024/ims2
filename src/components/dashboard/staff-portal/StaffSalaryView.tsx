import { TrendingUp } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';

interface StaffSalaryViewProps {
    fullProfile: any;
    salarySlips: any[];
}

export default function StaffSalaryView({ fullProfile, salarySlips }: StaffSalaryViewProps) {
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
        </div>
    );
}
