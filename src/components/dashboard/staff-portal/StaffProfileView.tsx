import Link from 'next/link';
import Image from 'next/image';
import FormattedDate from '@/components/common/FormattedDate';
import SafeHTML from '@/components/common/SafeHTML';
import { User, Mail, Phone, MapPin, Building, Briefcase, Calendar, CreditCard, FileText, Activity } from 'lucide-react';

interface StaffProfileViewProps {
    user: any;
    fullProfile: any;
}

export default function StaffProfileView({ user, fullProfile }: StaffProfileViewProps) {
    if (!fullProfile) return null;

    return (
        <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-8">
            {/* Profile Header Card */}
            <div className="card-premium p-8 relative overflow-hidden bg-white border border-secondary-100 shadow-xl rounded-[2rem]">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary-50 to-primary-100 rounded-full -mr-32 -mt-32 opacity-60 blur-3xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                    {/* Profile Picture */}
                    <div className="w-32 h-32 rounded-3xl bg-white p-2 shadow-lg ring-4 ring-primary-50 shrink-0">
                        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-secondary-800 to-secondary-900 flex items-center justify-center text-4xl font-black text-white overflow-hidden">
                            {fullProfile.profilePicture ? (
                                <Image src={fullProfile.profilePicture} alt="Profile" width={128} height={128} className="w-full h-full object-cover" />
                            ) : (
                                (user?.name?.[0] || user?.email?.charAt(0)).toUpperCase()
                            )}
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-3">
                        <div>
                            <h2 className="text-3xl font-black text-secondary-900">{user?.name || user?.email?.split('@')[0]}</h2>
                            <p className="text-primary-600 font-bold">{fullProfile.designatRef?.name || fullProfile.designation || 'Staff Member'}</p>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-2">
                            <span className="badge badge-secondary px-3 py-1 text-sm flex items-center gap-1">
                                <Building size={12} />
                                {fullProfile.department?.name || 'General Department'}
                            </span>
                            <span className="badge badge-primary px-3 py-1 text-sm flex items-center gap-1">
                                <Briefcase size={12} />
                                {user?.role?.replace('_', ' ')}
                            </span>
                            <span className={`badge ${fullProfile.isActive ? 'badge-success' : 'badge-danger'} px-3 py-1 text-sm flex items-center gap-1`}>
                                <Activity size={12} />
                                {fullProfile.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        {/* Reporting Manager Logic */}
                        {fullProfile.manager && (
                            <div className="bg-gradient-to-r from-secondary-50 to-transparent p-3 rounded-xl border border-secondary-100 flex items-center gap-3 mt-2 inline-flex">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm">
                                    {fullProfile.manager.name?.[0] || 'M'}
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-wider">Reports To</p>
                                    <p className="text-sm font-bold text-secondary-900 flex items-center gap-1">
                                        {fullProfile.manager.name || fullProfile.manager.email}
                                        {/* Cross-company indicator */}
                                        {fullProfile.manager.company && fullProfile.manager.company.id !== user?.companyId && (
                                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 rounded border border-indigo-100 ml-1" title={`From ${fullProfile.manager.company.name}`}>
                                                📍 {fullProfile.manager.company.name}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="text-secondary-500 font-medium max-w-lg mx-auto md:mx-0 pt-2 text-sm leading-relaxed">
                            <SafeHTML html={fullProfile.jobDescription || 'No professional summary available.'} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Personal Info */}
                <div className="card-premium p-6 hover:shadow-lg transition-all space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary-100 text-primary-600 rounded-lg"><User size={20} /></div>
                        <h3 className="text-lg font-bold text-secondary-900">Personal Information</h3>
                    </div>
                    <dl className="grid grid-cols-1 gap-y-4">
                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Email</dt>
                            <dd className="col-span-2 text-sm font-bold text-secondary-900 truncate" title={fullProfile.personalEmail}>{fullProfile.personalEmail || user?.email}</dd>
                        </div>
                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Phone</dt>
                            <dd className="col-span-2 text-sm font-bold text-secondary-900">{fullProfile.phoneNumber || '--'}</dd>
                        </div>
                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Office Ext</dt>
                            <dd className="col-span-2 text-sm font-bold text-secondary-900">{fullProfile.officePhone || '--'}</dd>
                        </div>
                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">DOB</dt>
                            <dd className="col-span-2 text-sm font-bold text-secondary-900"><FormattedDate date={fullProfile.dateOfBirth} /></dd>
                        </div>
                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Blood Group</dt>
                            <dd className="col-span-2 text-sm font-bold text-secondary-900">{fullProfile.bloodGroup || '--'}</dd>
                        </div>
                        <div className="grid grid-cols-3">
                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Address</dt>
                            <dd className="col-span-2 text-sm font-medium text-secondary-700">{fullProfile.address || '--'}</dd>
                        </div>
                    </dl>
                </div>

                {/* Professional Info */}
                <div className="card-premium p-6 hover:shadow-lg transition-all space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Briefcase size={20} /></div>
                        <h3 className="text-lg font-bold text-secondary-900">Professional Details</h3>
                    </div>
                    <dl className="grid grid-cols-1 gap-y-4">
                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Employee ID</dt>
                            <dd className="col-span-2 text-sm font-black text-secondary-900 font-mono tracking-wider">{fullProfile.employeeId || 'STM-???'}</dd>
                        </div>
                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Joined On</dt>
                            <dd className="col-span-2 text-sm font-bold text-secondary-900"><FormattedDate date={fullProfile.dateOfJoining} /></dd>
                        </div>
                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Experience</dt>
                            <dd className="col-span-2 text-sm font-bold text-secondary-900">{fullProfile.totalExperienceYears || 0} Y {fullProfile.totalExperienceMonths || 0} M</dd>
                        </div>
                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Department</dt>
                            <dd className="col-span-2 text-sm font-bold text-secondary-900">{fullProfile.department?.name || 'General'}</dd>
                        </div>
                        <div className="grid grid-cols-3">
                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Emergency</dt>
                            <dd className="col-span-2 text-sm font-bold text-danger-600">{fullProfile.emergencyContact || '--'}</dd>
                        </div>
                    </dl>
                </div>

                {/* Financial Info (Private) */}
                <div className="card-premium p-6 hover:shadow-lg transition-all space-y-6 border-t-4 border-success-500 md:col-span-2">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-success-100 text-success-600 rounded-lg"><CreditCard size={20} /></div>
                        <h3 className="text-lg font-bold text-secondary-900">Financial & Statutory</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Bank Name</dt>
                            <dd className="col-span-2 text-sm font-bold text-secondary-900">{fullProfile.bankName || '--'}</dd>
                        </div>
                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Account No</dt>
                            <dd className="col-span-2 text-sm font-mono text-secondary-900 font-bold">{fullProfile.accountNumber ? `XXXX-XXXX-${fullProfile.accountNumber.slice(-4)}` : '--'}</dd>
                        </div>
                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">IFSC Code</dt>
                            <dd className="col-span-2 text-sm font-mono text-secondary-900">{fullProfile.ifscCode || '--'}</dd>
                        </div>
                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">PAN Number</dt>
                            <dd className="col-span-2 text-sm font-bold text-secondary-900">{fullProfile.panNumber || '--'}</dd>
                        </div>
                        <div className="grid grid-cols-3">
                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">UAN / PF</dt>
                            <dd className="col-span-2 text-sm font-bold text-secondary-900">{fullProfile.uanNumber || '--'} / {fullProfile.pfNumber || '--'}</dd>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
