'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function NewCustomerPage() {
    const router = useRouter();
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [loading, setLoading] = useState(false);
    const [customerType, setCustomerType] = useState('INDIVIDUAL');
    const [institutions, setInstitutions] = useState<any[]>([]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
            if (!['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'].includes(user.role)) {
                router.push('/dashboard/customers');
            }
        } else {
            router.push('/login');
        }

        const fetchInstitutions = async () => {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/institutions', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setInstitutions(Array.isArray(data) ? data : (data.data || []));
            }
        };
        fetchInstitutions();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const data: any = {};
        formData.forEach((value, key) => {
            if (key.includes('inst_')) {
                if (!data.institutionDetails) data.institutionDetails = {};
                data.institutionDetails[key.replace('inst_', '')] = value;
            } else {
                data[key] = value;
            }
        });

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                const customer = await res.json();
                alert('Customer created successfully!');
                router.push(`/dashboard/customers/${customer.id}`);
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create customer');
            }
        } catch (error) {
            alert('A network error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Add New Customer</h1>
                        <p className="text-secondary-600 mt-1">Register a new client or institution in the system</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 pb-12">
                    {/* Basic Info */}
                    <div className="card-premium">
                        <h3 className="text-lg font-bold text-secondary-900 mb-6 border-l-4 border-primary-500 pl-4">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="label">Full Name / Contact Person *</label>
                                <input name="name" type="text" className="input" required placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="label">Primary Email *</label>
                                <input name="primaryEmail" type="email" className="input" required placeholder="john@example.com" />
                            </div>
                            <div>
                                <label className="label">Primary Phone</label>
                                <input name="primaryPhone" type="tel" className="input" placeholder="+1 234 567 890" />
                            </div>
                            <div>
                                <label className="label">Customer Type</label>
                                <select
                                    name="customerType"
                                    className="input"
                                    value={customerType}
                                    onChange={(e) => setCustomerType(e.target.value)}
                                >
                                    <option value="INDIVIDUAL">Individual</option>
                                    <option value="INSTITUTION">Institution</option>
                                    <option value="AGENCY">Agency</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="label">Organization Name</label>
                                <input name="organizationName" type="text" className="input" placeholder="e.g. Harvard University or Acme Corp" />
                            </div>
                            <div>
                                <label className="label">Link to Institution (Global)</label>
                                <select name="institutionId" className="input">
                                    <option value="">-- None / Individual --</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.name} ({inst.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Designation / Role</label>
                                <select name="designation" className="input">
                                    <option value="">-- Select Designation --</option>
                                    {[
                                        'STUDENT', 'TEACHER', 'FACULTY', 'HOD', 'PRINCIPAL', 'DEAN',
                                        'RESEARCHER', 'LIBRARIAN', 'ACCOUNTANT', 'DIRECTOR', 'REGISTRAR',
                                        'VICE_CHANCELLOR', 'CHANCELLOR', 'STAFF', 'OTHER'
                                    ].map(d => (
                                        <option key={d} value={d}>{d.replace('_', ' ')}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Address Info */}
                    <div className="card-premium">
                        <h3 className="text-lg font-bold text-secondary-900 mb-6 border-l-4 border-secondary-400 pl-4">Address & Tax Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="label">Billing Address</label>
                                <textarea name="billingAddress" className="input h-20" placeholder="Street, Building, etc."></textarea>
                            </div>
                            <div>
                                <label className="label">City</label>
                                <input name="city" type="text" className="input" />
                            </div>
                            <div>
                                <label className="label">State / Province</label>
                                <input name="state" type="text" className="input" />
                            </div>
                            <div>
                                <label className="label">Country</label>
                                <input name="country" type="text" className="input" placeholder="e.g. United States" />
                            </div>
                            <div>
                                <label className="label">Pincode / Zip Code</label>
                                <input name="pincode" type="text" className="input" />
                            </div>
                            <div>
                                <label className="label">GST / VAT / Tax ID</label>
                                <input name="gstVatTaxId" type="text" className="input" placeholder="Optional" />
                            </div>
                            <div>
                                <label className="label">Tags</label>
                                <input name="tags" type="text" className="input" placeholder="VIP, New, Academic (comma separated)" />
                            </div>
                        </div>
                    </div>

                    {/* Institutional Specific - Conditional */}
                    {customerType === 'INSTITUTION' && (
                        <div className="card-premium border-primary-100 bg-primary-50/30">
                            <h3 className="text-lg font-bold text-primary-900 mb-6 border-l-4 border-primary-600 pl-4">Institutional Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="label">Category</label>
                                    <select name="inst_category" className="input">
                                        <option value="University">University</option>
                                        <option value="College">College</option>
                                        <option value="Research Organization">Research Organization</option>
                                        <option value="Corporate">Corporate</option>
                                        <option value="Government">Government</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Department</label>
                                    <input name="inst_department" type="text" className="input" placeholder="e.g. Science & Technology" />
                                </div>
                                <div>
                                    <label className="label">Library Contact</label>
                                    <input name="inst_libraryContact" type="text" className="input" placeholder="Name of librarian" />
                                </div>
                                <div>
                                    <label className="label">IP Range(s)</label>
                                    <input name="inst_ipRange" type="text" className="input" placeholder="e.g. 192.168.1.1-192.168.1.255" />
                                </div>
                                <div>
                                    <label className="label">Number of Users</label>
                                    <input name="inst_numberOfUsers" type="number" className="input" placeholder="Total user base" />
                                </div>
                                <div>
                                    <label className="label">Number of Seats</label>
                                    <input name="inst_numberOfSeats" type="number" className="input" placeholder="Concurrent licenses" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="btn btn-secondary px-8"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary px-12"
                        >
                            {loading ? 'Creating...' : 'Create Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
