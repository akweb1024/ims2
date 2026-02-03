import { auth } from '@/lib/nextauth';
import { getManagerTeamMemberProfile } from '@/lib/team-service';
import { format } from 'date-fns';
import { User, Building, MapPin, Mail, Phone, Calendar, Clock, AlertTriangle, FileText, TrendingUp, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function TeamMemberProfilePage({
    params,
}: {
    params: Promise<{ userId: string }>;
}) {
    const { userId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
        return <div>Unauthorized</div>;
    }

    let profile;
    try {
        profile = await getManagerTeamMemberProfile(session.user.id, userId);
    } catch (e) {
        console.error("Error fetching profile:", e);
        return <div>Error loading profile</div>;
    }

    if (!profile) {
        return notFound();
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header / Basic Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-32 relative">
                    <div className="absolute -bottom-12 left-8">
                        <div className="h-24 w-24 rounded-2xl bg-white p-1 shadow-lg">
                            <div className="h-full w-full rounded-xl bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-400 border border-gray-200">
                                {profile.name?.charAt(0) || 'U'}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="pt-16 pb-6 px-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                        <p className="text-gray-500 font-medium">{profile.employeeProfile?.designation || profile.role}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <div className="flex items-center gap-1.5">
                                <Building className="h-4 w-4" />
                                {profile.companyName}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {profile.departmentName}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <a href={`mailto:${profile.email}`} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
                            <Mail className="h-5 w-5" />
                        </a>
                        {profile.employeeProfile?.phoneNumber && (
                            <a href={`tel:${profile.employeeProfile.phoneNumber}`} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
                                <Phone className="h-5 w-5" />
                            </a>
                        )}
                        <Link
                            href={`/dashboard/manager/team/work-reports?userId=${profile.id}`}
                            className="px-4 py-2 bg-primary-50 text-primary-700 font-medium rounded-lg hover:bg-primary-100 transition-colors"
                        >
                            View Reports
                        </Link>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <Clock className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Attendance</h3>
                    </div>
                    <p className="text-sm text-gray-500">Last 30 Days</p>
                    <div className="text-2xl font-bold mt-1 text-gray-900">
                        {profile.recentAttendance.filter(a => a.status === 'PRESENT').length}
                        <span className="text-base font-normal text-gray-400 ml-1">/ 30</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Pending Leaves</h3>
                    </div>
                    <p className="text-sm text-gray-500">Requires Action</p>
                    <div className="text-2xl font-bold mt-1 text-gray-900">
                        {profile.pendingLeaves.length}
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <FileText className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Work Reports</h3>
                    </div>
                    <p className="text-sm text-gray-500">This Month</p>
                    <div className="text-2xl font-bold mt-1 text-gray-900">
                        {profile.recentReports.length}
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Performance</h3>
                    </div>
                    <p className="text-sm text-gray-500">Last Rating</p>
                    <div className="text-2xl font-bold mt-1 text-gray-900">
                        {profile.recentReviews[0]?.rating || 'N/A'}
                        {profile.recentReviews[0]?.rating && <span className="text-base font-normal text-gray-400 ml-1">/ 5</span>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Employment Details */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">Employment Details</h3>
                        <Link href={`/dashboard/manager/team/salary?userId=${profile.id}`} className="text-primary-600 text-sm hover:underline">
                            View Salary
                        </Link>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Joining Date</label>
                                <p className="font-medium text-gray-900 mt-1">
                                    {profile.employeeProfile?.dateOfJoining ? format(new Date(profile.employeeProfile.dateOfJoining), 'MMM d, yyyy') : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Type</label>
                                <span className="inline-flex mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                    {profile.employeeProfile?.employeeType || 'FULL_TIME'}
                                </span>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Last Increment</label>
                                <p className="font-medium text-gray-900 mt-1">
                                    {profile.employeeProfile?.lastIncrementDate ? format(new Date(profile.employeeProfile.lastIncrementDate), 'MMM d, yyyy') : 'None'}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Base Salary</label>
                                <p className="font-medium text-gray-900 mt-1">
                                    ₹{profile.employeeProfile?.baseSalary?.toLocaleString() || '0'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Increments */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900">Recent Increments</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount/Unit</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {profile.incrementHistory.map((inc: any) => (
                                    <tr key={inc.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {format(new Date(inc.effectiveDate), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {inc.incrementAmount > 0 ? `+₹${inc.incrementAmount}` : `${inc.percentage}%`}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {profile.incrementHistory.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                                            No increment history found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
