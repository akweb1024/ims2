'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormField from '@/components/ui/FormField';
import { customerSchema, type CustomerFormData } from '@/lib/validation/schemas';
import { showSuccess, showError } from '@/lib/toast';
import { CRMPageShell } from '@/components/crm/CRMPageShell';
import { 
    UserPlus, ArrowLeft, Save, X, Info, ShieldCheck, 
    Globe, MapPin, Building2, CreditCard, ClipboardList,
    ChevronRight, Zap, Target
} from 'lucide-react';

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

            const payload = {
                name: data.name,
                primaryEmail: data.email,
                primaryPhone: data.phone,
                secondaryPhone: data.secondaryPhone || null,
                customerType: data.type,
                organizationName: data.organizationName || null,
                designation: data.designation || null,
                institutionId: data.institutionId || null,
                
                billingAddress: data.billingAddress || null,
                billingCity: data.billingCity || null,
                billingState: data.billingState || null,
                billingStateCode: data.billingStateCode || null,
                billingPincode: data.billingPincode || null,
                billingCountry: data.billingCountry || 'India',

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
                showSuccess('Customer Profile Initialized Successfully');
                router.push(`/dashboard/customers/${customer.id}`);
            } else {
                const err = await res.json();
                showError(err.error || 'Identity Propagation Failed');
            }
        } catch (error) {
            console.error('Create customer error:', error);
            showError('Global Network Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <CRMPageShell
                title="Initialize Customer Profile"
                subtitle="Establish a new identity node within the global customer relationship matrix."
                breadcrumb={[
                    { label: 'CRM', href: '/dashboard/crm' },
                    { label: 'Customer Matrix', href: '/dashboard/customers' },
                    { label: 'Node Initialization' }
                ]}
                icon={<UserPlus className="w-5 h-5" />}
                actions={
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2.5 px-6 py-3 bg-secondary-50 text-secondary-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-secondary-200 hover:bg-white hover:text-secondary-900 transition-all shadow-sm"
                    >
                        <ArrowLeft size={14} /> Abandon Initialization
                    </button>
                }
            >
                <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl mx-auto space-y-12 pb-32">
                    {/* Basic Intelligence Node */}
                    <div className="bg-white rounded-[3rem] border border-secondary-100 shadow-2xl shadow-secondary-100/50 relative overflow-hidden group">
                         {/* Header Matrix */}
                         <div className="p-8 border-b border-secondary-50 bg-secondary-50/30 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-200">
                                        <Info size={24} />
                                   </div>
                                   <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary-600 mb-1 leading-none">Primary Identity</span>
                                        <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tight italic">Basic Intel</h3>
                                   </div>
                              </div>
                              <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-white border border-secondary-200 rounded-xl">
                                   <ShieldCheck size={14} className="text-secondary-300" />
                                   <span className="text-[9px] font-black uppercase tracking-widest text-secondary-400">Integrity Check Valid</span>
                              </div>
                         </div>

                         <div className="p-10">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                  <FormField
                                      label="Full Identity Name"
                                      name="name"
                                      type="text"
                                      placeholder="EX: JOHNATHAN PROTOCOL"
                                      required
                                      register={register}
                                      error={errors.name}
                                      className="input-premium"
                                  />

                                  <FormField
                                      label="Primary Signal (Email)"
                                      name="email"
                                      type="email"
                                      placeholder="INTEL@CRYPTO.COM"
                                      required
                                      register={register}
                                      error={errors.email}
                                      className="input-premium"
                                  />

                                  <FormField
                                      label="Primary Vector (Phone)"
                                      name="phone"
                                      type="tel"
                                      placeholder="+X XXXXX XXXXX"
                                      required
                                      register={register}
                                      error={errors.phone}
                                      className="input-premium"
                                  />

                                  <FormField
                                      label="Secondary Signal mode"
                                      name="secondaryPhone"
                                      type="tel"
                                      placeholder="OPTIONAL VECTOR"
                                      register={register}
                                      error={errors.secondaryPhone}
                                      className="input-premium"
                                  />

                                  <FormField
                                      label="Classification Type"
                                      name="type"
                                      type="select"
                                      required
                                      register={register}
                                      error={errors.type}
                                      className="input-premium"
                                      options={[
                                          { value: 'INDIVIDUAL', label: 'SINGLE UNIT (INDIVIDUAL)' },
                                          { value: 'INSTITUTION', label: 'ORGANIZATIONAL NODE (INST)' },
                                          { value: 'AGENCY', label: 'EXTERNAL AGENT (AGENCY)' },
                                      ]}
                                  />

                                  <FormField
                                      label="Functional Designation"
                                      name="designation"
                                      type="text"
                                      placeholder="EX: LIBRARIAN / DIRECTOR"
                                      register={register}
                                      error={errors.designation}
                                      className="input-premium"
                                  />
                              </div>

                              <div className="mt-10 pt-10 border-t border-secondary-50 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                  <FormField
                                      label="Organization Designation"
                                      name="organizationName"
                                      type="text"
                                      placeholder="GLOBAL ACADEMY / ENTERPRISE X"
                                      register={register}
                                      error={errors.organizationName}
                                      className="input-premium"
                                  />

                                  <FormField
                                      label="Global Matrix Bind (Institution)"
                                      name="institutionId"
                                      type="select"
                                      register={register}
                                      error={errors.institutionId}
                                      className="input-premium"
                                      options={[
                                          { value: '', label: '-- NO MATRIX BIND / INDIVIDUAL --' },
                                          ...institutions.map(inst => ({
                                              value: inst.id,
                                              label: `${inst.name.toUpperCase()} [${inst.code}]`
                                          }))
                                      ]}
                                  />
                              </div>
                         </div>
                    </div>

                    {/* Operational Coordinates (Address) */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                         {/* Billing Matrix */}
                         <div className="bg-white rounded-[3rem] border border-secondary-100 shadow-xl shadow-secondary-100/50 relative overflow-hidden">
                              <div className="p-8 border-b border-secondary-50 bg-indigo-50/20 flex items-center gap-4">
                                   <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                                        <CreditCard size={24} />
                                   </div>
                                   <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-1 leading-none">Fiscal Hub</span>
                                        <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tight italic">Billing Matrix</h3>
                                   </div>
                              </div>
                              <div className="p-10 space-y-8">
                                   <FormField
                                       label="GSTIN / VAT ID Protocol"
                                       name="gstVatTaxId"
                                       type="text"
                                       placeholder="TAX-XXXXXX-XXXX"
                                       register={register}
                                       error={errors.gstVatTaxId}
                                       className="input-premium"
                                   />
                                   <FormField
                                       label="Base Street Coordinates"
                                       name="billingAddress"
                                       type="textarea"
                                       placeholder="BUILDING, STREET, BLOCK..."
                                       rows={3}
                                       register={register}
                                       error={errors.billingAddress}
                                       className="input-premium"
                                   />
                                   <div className="grid grid-cols-2 gap-6">
                                        <FormField label="Sector / City" name="billingCity" type="text" register={register} error={errors.billingCity} className="input-premium" />
                                        <FormField label="Region / State" name="billingState" type="text" register={register} error={errors.billingState} className="input-premium" />
                                        <FormField label="Zone Code" name="billingPincode" type="text" register={register} error={errors.billingPincode} className="input-premium" />
                                        <FormField label="Nation" name="billingCountry" type="text" defaultValue="India" register={register} error={errors.billingCountry} className="input-premium" />
                                   </div>
                              </div>
                         </div>

                         {/* Shipping Matrix */}
                         <div className="bg-white rounded-[3rem] border border-secondary-100 shadow-xl shadow-secondary-100/50 relative overflow-hidden">
                              <div className="p-8 border-b border-secondary-50 bg-blue-50/20 flex items-center justify-between">
                                   <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                                             <Globe size={24} />
                                        </div>
                                        <div className="flex flex-col">
                                             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-600 mb-1 leading-none">Deployment Hub</span>
                                             <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tight italic">Shipping Matrix</h3>
                                        </div>
                                   </div>
                                   <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-black text-secondary-400 uppercase tracking-widest leading-none">Mirror Billing</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsShippingSame(!isShippingSame)}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-500 ease-in-out focus:outline-none ${isShippingSame ? 'bg-blue-600' : 'bg-secondary-200'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xl transition duration-500 ease-in-out ${isShippingSame ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                   </div>
                              </div>
                              <div className="p-10">
                                   {!isShippingSame ? (
                                       <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                            <FormField
                                                label="Target Street Coordinates"
                                                name="shippingAddress"
                                                type="textarea"
                                                placeholder="ENTER DEPLOYMENT ADDRESS"
                                                rows={3}
                                                register={register}
                                                error={errors.shippingAddress}
                                                className="input-premium"
                                            />
                                            <div className="grid grid-cols-2 gap-6">
                                                <FormField label="Sector / City" name="shippingCity" type="text" register={register} error={errors.shippingCity} className="input-premium" />
                                                <FormField label="Region / State" name="shippingState" type="text" register={register} error={errors.shippingState} className="input-premium" />
                                                <FormField label="Zone Code" name="shippingPincode" type="text" register={register} error={errors.shippingPincode} className="input-premium" />
                                                <FormField label="Nation" name="shippingCountry" type="text" defaultValue="India" register={register} error={errors.shippingCountry} className="input-premium" />
                                            </div>
                                       </div>
                                   ) : (
                                       <div className="py-24 flex flex-col items-center justify-center text-center px-10">
                                            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-blue-100 animate-pulse">
                                                 <Zap size={32} />
                                            </div>
                                            <h4 className="text-[12px] font-black text-secondary-900 uppercase tracking-[0.2em] mb-2 leading-none">Coordinates Synced</h4>
                                            <p className="text-[10px] font-black text-secondary-300 uppercase tracking-widest leading-relaxed">System is mirroring the Fiscal Hub parameters for global deployment.</p>
                                       </div>
                                   )}
                              </div>
                         </div>
                    </div>

                    {/* Strategic notes Node */}
                    <div className="bg-white rounded-[3rem] border border-secondary-100 shadow-2xl shadow-secondary-100/50 relative overflow-hidden">
                         <div className="p-8 border-b border-secondary-50 bg-purple-50/20 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-100">
                                   <ClipboardList size={24} />
                              </div>
                              <div className="flex flex-col">
                                   <span className="text-[9px] font-black uppercase tracking-[0.3em] text-purple-600 mb-1 leading-none">Internal Archive</span>
                                   <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tight italic">Strategic Intel</h3>
                              </div>
                         </div>
                         <div className="p-10">
                              <FormField
                                  label="Observation Log"
                                  name="notes"
                                  type="textarea"
                                  placeholder="DOCUMENT INTERNAL INTEL, SPECIFIC BIASES, OR OPERATIONAL PREFERENCES..."
                                  rows={6}
                                  register={register}
                                  error={errors.notes}
                                  className="input-premium bg-secondary-50/30 border-dashed border-2 hover:bg-white hover:border-solid transition-all"
                                  helpText="INTERNAL ARCHIVE ACCESS ONLY"
                              />
                         </div>
                    </div>

                    {/* Operational Trigger Bar */}
                    <div className="sticky bottom-10 z-50 bg-secondary-950/90 backdrop-blur-xl p-6 px-10 rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 group">
                        <div className="flex items-center gap-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${isValid ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-white/30'}`}>
                                 {isValid ? <ShieldCheck size={24} /> : <Target size={24} className="animate-pulse" />}
                            </div>
                            <div className="flex flex-col">
                                {Object.keys(errors).length > 0 ? (
                                    <>
                                        <span className="text-[10px] font-black text-danger-500 uppercase tracking-[0.2em] mb-1">Integrity Errors Detected</span>
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">{Object.keys(errors).length} Nodes currently invalid</p>
                                    </>
                                ) : isValid ? (
                                    <>
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Integrity Validated</span>
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Profile nodes ready for propagation</p>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-1">Pending Calibration</span>
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Provide required parameters to initiate</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="flex-1 md:flex-none px-8 py-4 rounded-2xl text-[10px] font-black text-white/40 border border-white/5 hover:bg-white/5 hover:text-white transition-all uppercase tracking-widest"
                            >
                                Abandon
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !isValid}
                                className="flex-1 md:flex-none bg-primary-600 text-white px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary-900/50 hover:bg-primary-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:-translate-y-1 flex items-center justify-center gap-3 active:scale-95 group/btn"
                            >
                                {loading ? 'Initializing...' : (
                                    <>
                                        Propagate Identity Node <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </CRMPageShell>
        </DashboardLayout>
    );
}
