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
        kra: employee?.kra || ''
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
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.designation}
                                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                        placeholder="Senior Developer"
                                    />
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
