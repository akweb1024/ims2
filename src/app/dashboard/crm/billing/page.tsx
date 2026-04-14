'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CRMClientLayout from '../CRMClientLayout';
import { CRMPageShell, CRMBadge, CRMRowAction } from '@/components/crm/CRMPageShell';
import { FileText, Plus, FileSignature, Receipt, ArrowRight, ExternalLink } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';

export default function CRMBillingUnifiedPage() {
    return (
        <CRMClientLayout>
            <CRMPageShell
                title="Billing & Invoicing"
                subtitle="Manage proforma and final invoices centrally."
                icon={<FileText className="w-5 h-5" />}
                breadcrumb={[{ label: 'CRM', href: '/dashboard/crm' }, { label: 'Billing' }]}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                    {/* Proforma Invoices Box */}
                    <div className="bg-white rounded-3xl border border-secondary-100 shadow-xl overflow-hidden flex flex-col group">
                        <div className="p-6 bg-secondary-50/50 border-b border-secondary-100 flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform">
                                    <FileSignature size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-secondary-900 leading-tight">Proforma Invoices</h2>
                                    <p className="text-xs text-secondary-500 font-medium mt-1">Estimates and quotes before final billing</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-center">
                            <p className="text-sm text-secondary-600 mb-6 font-medium leading-relaxed">
                                Proforma invoices are used to provide clients with an estimated cost for subscriptions or services. They can be converted into final invoices once approved by the client.
                            </p>
                            <div className="flex flex-col gap-3 mt-auto">
                                <Link href="/dashboard/proforma/new" className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                                    <Plus size={16} /> Create New Proforma
                                </Link>
                                <Link href="/dashboard/proforma" className="flex items-center justify-center gap-2 bg-secondary-50 text-secondary-700 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-secondary-100 border border-secondary-200 transition-all">
                                    <ExternalLink size={16} className="text-secondary-400" /> View All Proformas
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Final Invoices Box */}
                    <div className="bg-white rounded-3xl border border-secondary-100 shadow-xl overflow-hidden flex flex-col group">
                        <div className="p-6 bg-secondary-50/50 border-b border-secondary-100 flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform">
                                    <Receipt size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-secondary-900 leading-tight">Final Invoices</h2>
                                    <p className="text-xs text-secondary-500 font-medium mt-1">Official tax invoices and payment collection</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-center">
                            <p className="text-sm text-secondary-600 mb-6 font-medium leading-relaxed">
                                Final invoices are official tax documents generated upon confirmation of sale. Managing these accurately ensures correct revenue tracking and financial compliance.
                            </p>
                            <div className="flex flex-col gap-3 mt-auto">
                                <Link href="/dashboard/crm/invoices/new" className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all">
                                    <Plus size={16} /> Create Final Invoice
                                </Link>
                                <Link href="/dashboard/crm/invoices" className="flex items-center justify-center gap-2 bg-secondary-50 text-secondary-700 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-secondary-100 border border-secondary-200 transition-all">
                                    <ArrowRight size={16} className="text-secondary-400" /> Go to Invoice ledger
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </CRMPageShell>
        </CRMClientLayout>
    );
}
