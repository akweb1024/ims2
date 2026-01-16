'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    FileText,
    Upload,
    Save,
    CHECK_CIRCLE,
    AlertCircle,
    DollarSign,
    Shield
} from 'lucide-react';

interface TaxDeclaration {
    id: string;
    fiscalYear: string;
    regime: 'OLD' | 'NEW';
    section80C: number;
    section80D: number;
    hraRentPaid: number;
    homeLoanInterest: number;
    otherIncome: number;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
    proofs: any[];
}

export default function TaxDeclarationPage() {
    const [loading, setLoading] = useState(false);
    const [declaration, setDeclaration] = useState<TaxDeclaration>({
        id: '',
        fiscalYear: '2025-2026',
        regime: 'NEW',
        section80C: 0,
        section80D: 0,
        hraRentPaid: 0,
        homeLoanInterest: 0,
        otherIncome: 0,
        status: 'DRAFT',
        proofs: []
    });

    // Mock Fetch
    useEffect(() => {
        // In real app: fetch('/api/staff/tax-declaration')
    }, []);

    const handleChange = (field: keyof TaxDeclaration, value: any) => {
        setDeclaration(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Mock API submit
            await new Promise(resolve => setTimeout(resolve, 1000));
            setDeclaration(prev => ({ ...prev, status: 'SUBMITTED' }));
            alert('Tax declaration submitted successfully!');
        } catch (error) {
            alert('Failed to submit declaration');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        Tax Declaration (IT Investment)
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Submit your investment proofs and choose your tax regime for FY {declaration.fiscalYear}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Regime Selection */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">1. Tax Regime Selection</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className={`cursor-pointer border-2 rounded-xl p-4 flex items-start gap-4 transition-all ${declaration.regime === 'NEW' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <input
                                        type="radio"
                                        name="regime"
                                        value="NEW"
                                        checked={declaration.regime === 'NEW'}
                                        onChange={() => handleChange('regime', 'NEW')}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white">New Regime (Default)</div>
                                        <p className="text-sm text-gray-500 mt-1">Lower tax rates, but no deductions (80C, HRA, etc. not applicable).</p>
                                    </div>
                                </label>

                                <label className={`cursor-pointer border-2 rounded-xl p-4 flex items-start gap-4 transition-all ${declaration.regime === 'OLD' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <input
                                        type="radio"
                                        name="regime"
                                        value="OLD"
                                        checked={declaration.regime === 'OLD'}
                                        onChange={() => handleChange('regime', 'OLD')}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white">Old Regime</div>
                                        <p className="text-sm text-gray-500 mt-1">Higher tax rates, but allows all standard deductions.</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {declaration.regime === 'OLD' && (
                            <>
                                {/* Section 80C */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">2. Section 80C (Max ₹1.5L)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Total Investment Amount
                                            </label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                <input
                                                    type="number"
                                                    value={declaration.section80C}
                                                    onChange={(e) => handleChange('section80C', Number(e.target.value))}
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Includes PF, PPF, ELSS, LIC, Principal Repayment</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Upload Proofs
                                            </label>
                                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                                                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                                <span className="text-sm text-gray-500">Click to upload PDF/Image</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Other Sections */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">3. Other Deductions</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Section 80D (Medical Insurance)
                                            </label>
                                            <input
                                                type="number"
                                                value={declaration.section80D}
                                                onChange={(e) => handleChange('section80D', Number(e.target.value))}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                HRA Rent Paid (Annual)
                                            </label>
                                            <input
                                                type="number"
                                                value={declaration.hraRentPaid}
                                                onChange={(e) => handleChange('hraRentPaid', Number(e.target.value))}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Home Loan Interest (Sec 24)
                                            </label>
                                            <input
                                                type="number"
                                                value={declaration.homeLoanInterest}
                                                onChange={(e) => handleChange('homeLoanInterest', Number(e.target.value))}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
                            <span className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${declaration.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                    declaration.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                }`}>
                                Status: {declaration.status}
                            </span>
                            <button
                                type="submit"
                                disabled={loading || declaration.status === 'APPROVED'}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? 'Submitting...' : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Submit Declaration
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
