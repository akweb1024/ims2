'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormField from '@/components/ui/FormField';
import { customerSchema, type CustomerFormData } from '@/lib/validation/schemas';
import { showSuccess, showError } from '@/lib/toast';

export default function NewCustomerPage() {
    const router = useRouter();
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [loading, setLoading] = useState(false);
    const [institutions, setInstitutions] = useState<any[]>([]);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isValid },
    } = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema),
        mode: 'onChange', // Validate on change for real-time feedback
    });

    const customerType = watch('type', 'INDIVIDUAL');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
            if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'].includes(user.role)) {
                router.push('/dashboard/customers');
            }
        } else {
            router.push('/login');
        }

        const fetchInstitutions = async () => {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/institutions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInstitutions(Array.isArray(data) ? data : (data.data || []));
            }
        };
        fetchInstitutions();
    }, [router]);

    const onSubmit = async (data: CustomerFormData) => {
        setLoading(true);

        try {
            const token = localStorage.getItem('token');

            // Transform data for API
            const payload = {
                name: data.name,
                primaryEmail: data.email,
                primaryPhone: data.phone,
                secondaryPhone: data.secondaryPhone || null,
                customerType: data.type,
                organizationName: data.organizationName || null,
                designation: data.designation || null,
                institutionId: data.institutionId || null,
                billingAddress: data.address || null,
                city: data.city || null,
                state: data.state || null,
                country: data.country || null,
                pincode: data.postalCode || null,
                notes: data.notes || null,
            };

            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const customer = await res.json();
                showSuccess('Customer created successfully!');
                router.push(`/dashboard/customers/${customer.id}`);
            } else {
                const err = await res.json();
                showError(err.error || 'Failed to create customer');
            }
        } catch (error) {
            console.error('Create customer error:', error);
            showError('A network error occurred');
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

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-12">
                    {/* Basic Information */}
                    <div className="card-premium">
                        <h3 className="text-lg font-bold text-secondary-900 mb-6 border-l-4 border-primary-500 pl-4">
                            Basic Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                label="Full Name / Contact Person"
                                name="name"
                                type="text"
                                placeholder="John Doe"
                                required
                                register={register}
                                error={errors.name}
                            />

                            <FormField
                                label="Primary Email"
                                name="email"
                                type="email"
                                placeholder="john@example.com"
                                required
                                register={register}
                                error={errors.email}
                            />

                            <FormField
                                label="Primary Phone"
                                name="phone"
                                type="tel"
                                placeholder="+1 234 567 890"
                                required
                                register={register}
                                error={errors.phone}
                                helpText="Include country code for international numbers"
                            />

                            <FormField
                                label="Secondary Phone"
                                name="secondaryPhone"
                                type="tel"
                                placeholder="+1 234 567 890"
                                register={register}
                                error={errors.secondaryPhone}
                            />

                            <FormField
                                label="Customer Type"
                                name="type"
                                type="select"
                                required
                                register={register}
                                error={errors.type}
                                options={[
                                    { value: 'INDIVIDUAL', label: 'Individual' },
                                    { value: 'INSTITUTION', label: 'Institution' },
                                    { value: 'AGENCY', label: 'Agency' },
                                ]}
                            />

                            <FormField
                                label="Designation / Role"
                                name="designation"
                                type="text"
                                placeholder="e.g., Professor, Librarian, Director"
                                register={register}
                                error={errors.designation}
                            />

                            <div className="md:col-span-2">
                                <FormField
                                    label="Organization Name"
                                    name="organizationName"
                                    type="text"
                                    placeholder="e.g., Harvard University or Acme Corp"
                                    register={register}
                                    error={errors.organizationName}
                                    helpText="Leave blank for individual customers"
                                />
                            </div>

                            <FormField
                                label="Link to Institution (Global)"
                                name="institutionId"
                                type="select"
                                register={register}
                                error={errors.institutionId}
                                options={[
                                    { value: '', label: '-- None / Individual --' },
                                    ...institutions.map(inst => ({
                                        value: inst.id,
                                        label: `${inst.name} (${inst.code})`
                                    }))
                                ]}
                            />
                        </div>
                    </div>

                    {/* Address & Contact Details */}
                    <div className="card-premium">
                        <h3 className="text-lg font-bold text-secondary-900 mb-6 border-l-4 border-secondary-400 pl-4">
                            Address & Contact Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <FormField
                                    label="Address"
                                    name="address"
                                    type="textarea"
                                    placeholder="Street, Building, etc."
                                    rows={3}
                                    register={register}
                                    error={errors.address}
                                />
                            </div>

                            <FormField
                                label="City"
                                name="city"
                                type="text"
                                placeholder="e.g., New York"
                                register={register}
                                error={errors.city}
                            />

                            <FormField
                                label="State / Province"
                                name="state"
                                type="text"
                                placeholder="e.g., California"
                                register={register}
                                error={errors.state}
                            />

                            <FormField
                                label="Country"
                                name="country"
                                type="text"
                                placeholder="e.g., United States"
                                register={register}
                                error={errors.country}
                            />

                            <FormField
                                label="Postal Code"
                                name="postalCode"
                                type="text"
                                placeholder="e.g., 10001"
                                register={register}
                                error={errors.postalCode}
                            />
                        </div>
                    </div>

                    {/* Additional Notes */}
                    <div className="card-premium">
                        <h3 className="text-lg font-bold text-secondary-900 mb-6 border-l-4 border-purple-400 pl-4">
                            Additional Information
                        </h3>
                        <FormField
                            label="Notes"
                            name="notes"
                            type="textarea"
                            placeholder="Any additional information about this customer..."
                            rows={4}
                            register={register}
                            error={errors.notes}
                            helpText="Internal notes visible only to staff"
                        />
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            {Object.keys(errors).length > 0 && (
                                <span className="text-red-600 font-medium">
                                    ⚠️ Please fix {Object.keys(errors).length} error{Object.keys(errors).length > 1 ? 's' : ''} before submitting
                                </span>
                            )}
                            {isValid && Object.keys(errors).length === 0 && (
                                <span className="text-green-600 font-medium">
                                    ✓ Form is valid and ready to submit
                                </span>
                            )}
                        </div>
                        <div className="flex space-x-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="btn btn-secondary px-8"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !isValid}
                                className="btn btn-primary px-12 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating...' : 'Create Customer'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
