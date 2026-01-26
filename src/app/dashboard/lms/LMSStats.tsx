import { DollarSign, Users, Mail } from 'lucide-react';

async function getLMSStats() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/lms/analytics`, {
        cache: 'no-store'
    });

    if (!res.ok) {
        throw new Error('Failed to fetch LMS stats');
    }

    return res.json();
}

export default async function LMSStats() {
    const { stats } = await getLMSStats();

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card-dashboard p-6 bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-white/80 text-sm font-medium">Total Revenue</p>
                        <h3 className="text-3xl font-bold mt-1">₹{(stats?.total?.revenue || 0).toLocaleString()}</h3>
                    </div>
                    <div className="p-2 bg-white/20 rounded-lg">
                        <DollarSign size={24} className="text-white" />
                    </div>
                </div>
            </div>

            <div className="card-dashboard p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-secondary-500 text-sm font-medium">Licenses Issued</p>
                        <h3 className="text-3xl font-bold text-secondary-900 mt-1">{stats?.total?.enrollments || 0}</h3>
                        <p className="text-[10px] text-secondary-400 font-medium mt-1">Total Enrollments</p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Users size={24} className="text-blue-600" />
                    </div>
                </div>
            </div>

            <div className="card-dashboard p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-secondary-500 text-sm font-medium">Email Notifications</p>
                        <h3 className="text-3xl font-bold text-secondary-900 mt-1">{stats?.total?.emailCount || 0}</h3>
                        <p className="text-[10px] text-secondary-400 font-medium mt-1">Sent to learners</p>
                    </div>
                    <div className="p-2 bg-orange-100 rounded-lg">
                        <Mail size={24} className="text-orange-600" />
                    </div>
                </div>
            </div>

            <div className="card-dashboard p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-secondary-500 text-sm font-medium">Mentor Payouts</p>
                        <h3 className="text-3xl font-bold text-secondary-900 mt-1">₹{(stats?.total?.mentorPayouts || 0).toLocaleString()}</h3>
                    </div>
                    <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign size={24} className="text-green-600" />
                    </div>
                </div>
            </div>
        </div>
    );
}
