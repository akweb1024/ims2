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
    const [isShippingSame, setIsShippingSame] = useState(true);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isValid },
    } = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema) as any,
        mode: 'onChange',

        defaultValues: {
            name: '',
            email: '',
            phone: '',
            secondaryPhone: '',
            type: 'INDIVIDUAL',
            organizationName: '',
            designation: '',
            institutionId: '',
            gstVatTaxId: '',
            billingAddress: '',
            billingCity: '',
            billingState: '',
            billingStateCode: '',
            billingPincode: '',
            billingCountry: 'India',
            shippingAddress: '',
            shippingCity: '',
            shippingState: '',
            shippingStateCode: '',
            shippingPincode: '',
            shippingCountry: 'India',
            notes: ''
        }
    });


    const customerType = watch('type', 'INDIVIDUAL');
    const billingAddress = watch('billingAddress');

    // Effect to sync shipping if 'Same as' is checked
    useEffect(() => {
        if (isShippingSame) {
            const values = watch();
            setValue('shippingAddress', values.billingAddress);
            setValue('shippingCity', values.billingCity);
            setValue('shippingState', values.billingState);
            setValue('shippingStateCode', values.billingStateCode);
            setValue('shippingPincode', values.billingPincode);
            setValue('shippingCountry', values.billingCountry);
        }
    }, [isShippingSame, billingAddress, watch, setValue]);

    useEffect(() => {
        if (customerType === 'AGENCY') {
            setUserRole('AGENCY');
        } else {
            setUserRole('CUSTOMER');
        }
    }, [customerType]);

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
                
                // Structured Billing
                billingAddress: data.billingAddress || null,
                billingCity: data.billingCity || null,
                billingState: data.billingState || null,
                billingStateCode: data.billingStateCode || null,
                billingPincode: data.billingPincode || null,
                billingCountry: data.billingCountry || 'India',

                // Structured Shipping
                shippingAddress: data.shippingAddress || data.billingAddress || null,
                shippingCity: data.shippingCity || data.billingCity || null,
                shippingState: data.shippingState || data.billingState || null,
                shippingStateCode: data.shippingStateCode || data.billingStateCode || null,
                shippingPincode: data.shippingPincode || data.billingPincode || null,
                shippingCountry: data.shippingCountry || data.billingCountry || 'India',

                gstVatTaxId: data.gstVatTaxId || null,
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

                    {/* Tax Information */}
                    <div className="card-premium">
                        <h3 className="text-lg font-bold text-secondary-900 mb-6 border-l-4 border-indigo-500 pl-4">
                            Tax Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                label="GSTIN / VAT ID"
                                name="gstVatTaxId"
                                type="text"
                                placeholder="e.g. 07AAAAA0000A1Z5"
                                register={register}
                                error={errors.gstVatTaxId}
                                helpText="Required for Indian GST Tax Invoices"
                            />
                        </div>
                    </div>

                    {/* Billing Address */}
                    <div className="card-premium">
                        <h3 className="text-lg font-bold text-secondary-900 mb-6 border-l-4 border-secondary-400 pl-4">
                            Billing Address
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <FormField
                                    label="Street Address / Building"
                                    name="billingAddress"
                                    type="textarea"
                                    placeholder="Street, Building, etc."
                                    rows={2}
                                    register={register}
                                    error={errors.billingAddress}
                                />
                            </div>
                            <FormField label="City" name="billingCity" type="text" register={register} error={errors.billingCity} />
                            <FormField label="State" name="billingState" type="text" register={register} error={errors.billingState} />
                            <FormField label="State Code" name="billingStateCode" type="text" placeholder="e.g. 07 (for Delhi)" register={register} error={errors.billingStateCode} />
                            <FormField label="Pincode" name="billingPincode" type="text" register={register} error={errors.billingPincode} />
                            <FormField label="Country" name="billingCountry" type="text" defaultValue="India" register={register} error={errors.billingCountry} />
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="card-premium">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-secondary-900 border-l-4 border-info-500 pl-4">
                                Shipping Address
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsShippingSame(!isShippingSame)}
                                className={`flex items-center gap-2 group transition-all duration-300 ${isShippingSame ? 'text-primary-600' : 'text-secondary-400 hover:text-primary-500'}`}
                            >
                                <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${isShippingSame ? 'bg-primary-600' : 'bg-secondary-200'}`}>
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${isShippingSame ? 'left-6' : 'left-1'}`}></div>
                                </div>
                                <span className="text-sm font-bold uppercase tracking-tight">Same as Billing</span>
                            </button>
                        </div>
                        
                        {!isShippingSame ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="md:col-span-2">
                                    <FormField
                                        label="Street Address / Building"
                                        name="shippingAddress"
                                        type="textarea"
                                        placeholder="Enter shipping address"
                                        rows={2}
                                        register={register}
                                        error={errors.shippingAddress}
                                    />
                                </div>
                                <FormField label="City" name="shippingCity" type="text" register={register} error={errors.shippingCity} />
                                <FormField label="State" name="shippingState" type="text" register={register} error={errors.shippingState} />
                                <FormField label="State Code" name="shippingStateCode" type="text" register={register} error={errors.shippingStateCode} />
                                <FormField label="Pincode" name="shippingPincode" type="text" register={register} error={errors.shippingPincode} />
                                <FormField label="Country" name="shippingCountry" type="text" defaultValue="India" register={register} error={errors.shippingCountry} />
                            </div>
                        ) : (
                            <div className="bg-primary-50/50 p-4 rounded-xl border border-primary-100 border-dashed text-center">
                                <p className="text-sm text-primary-600 font-medium">Shipping address is synchronized with billing information.</p>
                                <p className="text-[10px] text-primary-400 mt-1 uppercase font-bold">Safe for logistics and tax calculation</p>
                            </div>
                        )}
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
