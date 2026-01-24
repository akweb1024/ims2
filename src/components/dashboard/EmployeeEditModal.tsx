// Employee Profile Edit Modal Component
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface EmployeeEditModalProps {
    employee: any;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}

export default function EmployeeEditModal({ employee, isOpen, onClose, onSave }: EmployeeEditModalProps) {
    const [formData, setFormData] = useState({
        name: employee?.user?.name || '',
        email: employee?.user?.email || '',
        phone: employee?.phone || '',
        designation: employee?.designation || '',
        department: employee?.department || '',
        baseSalary: employee?.baseSalary || '',
        bankName: employee?.bankName || '',
        accountNumber: employee?.accountNumber || '',
        ifscCode: employee?.ifscCode || '',
        panNumber: employee?.panNumber || '',
        aadharNumber: employee?.aadharNumber || '',
        dateOfJoining: employee?.dateOfJoining?.split('T')[0] || '',
        dateOfBirth: employee?.dateOfBirth?.split('T')[0] || '',
        address: employee?.address || '',
        emergencyContact: employee?.emergencyContact || '',
        bloodGroup: employee?.bloodGroup || '',
        profilePhoto: employee?.profilePhoto || '',
        offerLetterUrl: employee?.offerLetterUrl || '',
        contractUrl: employee?.contractUrl || '',
        jobDescription: employee?.jobDescription || '',
        kra: employee?.kra || '',
        totalExperienceYears: employee?.totalExperienceYears || 0,
        totalExperienceMonths: employee?.totalExperienceMonths || 0,
        relevantExperienceYears: employee?.relevantExperienceYears || 0,
        relevantExperienceMonths: employee?.relevantExperienceMonths || 0,
        grade: employee?.grade || '',
        lastPromotionDate: employee?.lastPromotionDate?.split('T')[0] || '',
        lastIncrementDate: employee?.lastIncrementDate?.split('T')[0] || '',
        nextReviewDate: employee?.nextReviewDate?.split('T')[0] || '',
        lastIncrementPercentage: employee?.lastIncrementPercentage || '',
        designationId: employee?.designationId || '',
        qualification: employee?.qualification || '',
        skills: employee?.skills || [],
        expertise: employee?.expertise || []
    });

    const [designations, setDesignations] = useState<any[]>([]);

    useState(() => {
        fetch('/api/hr/designations')
            .then(res => res.json())
            .then(data => setDesignations(Array.isArray(data) ? data : []))
            .catch(err => console.error('Error fetching designations:', err));
    });

    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave({ id: employee.id, ...formData });
            onClose();
        } catch (error) {
            console.error('Error saving:', error);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black">Edit Employee Profile</h2>
                        <p className="text-primary-100 text-sm mt-1">{employee?.user?.email}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    <div className="space-y-6">
                        {/* Personal Information */}
                        <div>
                            <h3 className="text-lg font-black text-secondary-900 mb-4 pb-2 border-b">Personal Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Full Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="label">Email</label>
                                    <input
                                        type="email"
                                        className="input bg-secondary-50"
                                        value={formData.email}
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="label">Phone Number</label>
                                    <input
                                        type="tel"
                                        className="input"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+91 9876543210"
                                    />
                                </div>
                                <div>
                                    <label className="label">Date of Birth</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={formData.dateOfBirth}
                                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label">Blood Group</label>
                                    <select
                                        className="input"
                                        value={formData.bloodGroup}
                                        onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                                    >
                                        <option value="">Select</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Profile Photo URL</label>
                                    <input
                                        type="url"
                                        className="input"
                                        value={formData.profilePhoto}
                                        onChange={(e) => setFormData({ ...formData, profilePhoto: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="label">Address</label>
                                    <textarea
                                        className="input"
                                        rows={2}
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Full address"
                                    />
                                </div>
                                <div>
                                    <label className="label">Emergency Contact</label>
                                    <input
                                        type="tel"
                                        className="input"
                                        value={formData.emergencyContact}
                                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                                        placeholder="+91 9876543210"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Employment Details */}
                        <div>
                            <h3 className="text-lg font-black text-secondary-900 mb-4 pb-2 border-b">Employment Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Designation</label>
                                    <select
                                        className="input"
                                        value={formData.designationId}
                                        onChange={(e) => {
                                            const desId = e.target.value;
                                            const selected = designations.find(d => d.id === desId);
                                            setFormData({
                                                ...formData,
                                                designationId: desId,
                                                designation: selected?.name || formData.designation,
                                                jobDescription: selected?.jobDescription || formData.jobDescription,
                                                kra: selected?.kra || formData.kra
                                            });
                                        }}
                                    >
                                        <option value="">Select Designation</option>
                                        {designations.map(d => (
                                            <option key={d.id} value={d.id}>{d.name} {d.code ? `(${d.code})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Department</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        placeholder="Engineering"
                                    />
                                </div>
                                <div>
                                    <label className="label">Date of Joining</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={formData.dateOfJoining}
                                        onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label">Base Salary (₹)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={formData.baseSalary}
                                        onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                                        placeholder="50000"
                                    />
                                </div>
                                <div>
                                    <label className="label">Grade / Level</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.grade}
                                        onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                                        placeholder="L1, Senior, etc."
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="label">Qualification</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.qualification}
                                        onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                                        placeholder="B.Tech, MBA, etc."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Experience & Growth */}
                        <div>
                            <h3 className="text-lg font-black text-secondary-900 mb-4 pb-2 border-b">Experience & Growth Tracker</h3>

                            {/* Skills & Expertise */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="label">Skills (Comma separated)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="React, Node.js"
                                        value={Array.isArray(formData.skills) ? formData.skills.join(', ') : formData.skills || ''}
                                        onChange={(e) => setFormData({ ...formData, skills: e.target.value.split(',').map(s => s.trim()) })}
                                    />
                                </div>
                                <div>
                                    <label className="label">Expertise (Comma separated)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Leadership, Architecture"
                                        value={Array.isArray(formData.expertise) ? formData.expertise.join(', ') : formData.expertise || ''}
                                        onChange={(e) => setFormData({ ...formData, expertise: e.target.value.split(',').map(s => s.trim()) })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4 p-4 bg-secondary-50 rounded-2xl">
                                    <h4 className="font-bold text-secondary-700 text-sm uppercase">Pre-joining Experience</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-secondary-400">Years</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.totalExperienceYears}
                                                onChange={(e) => setFormData({ ...formData, totalExperienceYears: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-secondary-400">Months</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.totalExperienceMonths}
                                                onChange={(e) => setFormData({ ...formData, totalExperienceMonths: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 p-4 bg-primary-50 rounded-2xl">
                                    <h4 className="font-bold text-primary-700 text-sm uppercase">Relevant Experience</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-primary-400">Years</label>
                                            <input
                                                type="number"
                                                className="input border-primary-100 focus:ring-primary-100"
                                                value={formData.relevantExperienceYears}
                                                onChange={(e) => setFormData({ ...formData, relevantExperienceYears: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-primary-400">Months</label>
                                            <input
                                                type="number"
                                                className="input border-primary-100 focus:ring-primary-100"
                                                value={formData.relevantExperienceMonths}
                                                onChange={(e) => setFormData({ ...formData, relevantExperienceMonths: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="label">Last Promotion Date</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={formData.lastPromotionDate}
                                        onChange={(e) => setFormData({ ...formData, lastPromotionDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label">Last Increment Date</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={formData.lastIncrementDate}
                                        onChange={(e) => setFormData({ ...formData, lastIncrementDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label">Last Increment (%)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input"
                                        value={formData.lastIncrementPercentage}
                                        onChange={(e) => setFormData({ ...formData, lastIncrementPercentage: parseFloat(e.target.value) || 0 })}
                                        placeholder="10.5"
                                    />
                                </div>
                                <div>
                                    <label className="label">Next Performance Review</label>
                                    <input
                                        type="date"
                                        className="input border-warning-200"
                                        value={formData.nextReviewDate}
                                        onChange={(e) => setFormData({ ...formData, nextReviewDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Financial Information */}
                        <div>
                            <h3 className="text-lg font-black text-secondary-900 mb-4 pb-2 border-b">Financial Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Bank Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.bankName}
                                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                        placeholder="HDFC Bank"
                                    />
                                </div>
                                <div>
                                    <label className="label">Account Number</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.accountNumber}
                                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                        placeholder="1234567890"
                                    />
                                </div>
                                <div>
                                    <label className="label">IFSC Code</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.ifscCode}
                                        onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                                        placeholder="HDFC0001234"
                                    />
                                </div>
                                <div>
                                    <label className="label">PAN Number</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.panNumber}
                                        onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                                        placeholder="ABCDE1234F"
                                    />
                                </div>
                                <div>
                                    <label className="label">Aadhar Number</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.aadharNumber}
                                        onChange={(e) => setFormData({ ...formData, aadharNumber: e.target.value })}
                                        placeholder="1234 5678 9012"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Documents */}
                        <div>
                            <h3 className="text-lg font-black text-secondary-900 mb-4 pb-2 border-b">Documents & Links</h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="label">Offer Letter URL</label>
                                    <input
                                        type="url"
                                        className="input"
                                        value={formData.offerLetterUrl}
                                        onChange={(e) => setFormData({ ...formData, offerLetterUrl: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <label className="label">Contract URL</label>
                                    <input
                                        type="url"
                                        className="input"
                                        value={formData.contractUrl}
                                        onChange={(e) => setFormData({ ...formData, contractUrl: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <label className="label">Job Description</label>
                                    <textarea
                                        className="input"
                                        rows={3}
                                        value={formData.jobDescription}
                                        onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                                        placeholder="Detailed job description..."
                                    />
                                </div>
                                <div>
                                    <label className="label">Key Responsibility Areas (KRA)</label>
                                    <textarea
                                        className="input"
                                        rows={3}
                                        value={formData.kra}
                                        onChange={(e) => setFormData({ ...formData, kra: e.target.value })}
                                        placeholder="List of KRAs..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary px-6"
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary px-8"
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
