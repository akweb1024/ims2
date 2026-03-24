'use client';

import { useMemo, useState, useEffect } from 'react';
import { FileText, Send, Plus, Eye, CheckCircle, Download, Copy } from 'lucide-react';
import { HR_PRESETS } from '@/lib/hr-presets';

export default function DocumentManager({ employees }: { employees: any[] }) {
    const [templates, setTemplates] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ title: '', type: 'OFFER_LETTER', content: '' });

    // Issuing
    const [mode, setMode] = useState<'SINGLE' | 'BULK'>('SINGLE');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [bulkTarget, setBulkTarget] = useState<'ALL' | 'DESIGNATION' | 'EMPLOYEE_TYPE'>('ALL');
    const [bulkDesignation, setBulkDesignation] = useState('');
    const [bulkEmployeeType, setBulkEmployeeType] = useState('');
    const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

    const designationOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    employees
                        .map((employee) => employee.designation)
                        .filter((value): value is string => Boolean(value))
                )
            ).sort(),
        [employees]
    );

    const employeeTypeOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    employees
                        .map((employee) => employee.employeeType)
                        .filter((value): value is string => Boolean(value))
                )
            ).sort(),
        [employees]
    );

    const sampleEmployee = useMemo(() => {
        if (mode === 'SINGLE' && selectedEmployee) {
            return employees.find((employee) => employee.id === selectedEmployee) || employees[0];
        }

        if (mode === 'BULK' && bulkTarget === 'DESIGNATION' && bulkDesignation) {
            return employees.find((employee) => employee.designation === bulkDesignation) || employees[0];
        }

        if (mode === 'BULK' && bulkTarget === 'EMPLOYEE_TYPE' && bulkEmployeeType) {
            return employees.find((employee) => employee.employeeType === bulkEmployeeType) || employees[0];
        }

        return employees[0];
    }, [employees, selectedEmployee, mode, bulkTarget, bulkDesignation, bulkEmployeeType]);

    const activeTemplate = useMemo(
        () => templates.find((template) => template.id === selectedTemplate) || null,
        [templates, selectedTemplate]
    );

    const previewTemplate = useMemo(
        () => templates.find((template) => template.id === previewTemplateId) || null,
        [templates, previewTemplateId]
    );

    const hydrateTemplate = (content: string, employee?: any) => {
        if (!employee) return content;

        const vars: Record<string, string> = {
            name: employee.user?.name || employee.user?.email?.split('@')[0] || 'Employee Name',
            email: employee.user?.email || 'employee@example.com',
            designation: employee.designation || 'Specialist',
            salary: (employee.baseSalary || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
            joiningDate: employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString('en-GB') : 'Date to be decided',
            employeeId: employee.employeeId || employee.id || 'EMP-001',
            companyName: employee.user?.company?.name || 'STM Journal Solutions',
            address: employee.address || 'Address not provided',
            phone: employee.phoneNumber || employee.user?.phone || 'Phone not provided',
            panNumber: employee.panNumber || 'PAN not available',
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        };

        let output = content;
        Object.entries(vars).forEach(([key, value]) => {
            output = output.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
        });

        return output;
    };

    const bulkTargetEmployees = useMemo(() => {
        if (bulkTarget === 'DESIGNATION' && bulkDesignation) {
            return employees.filter((employee) => employee.designation === bulkDesignation);
        }

        if (bulkTarget === 'EMPLOYEE_TYPE' && bulkEmployeeType) {
            return employees.filter((employee) => employee.employeeType === bulkEmployeeType);
        }

        return employees;
    }, [employees, bulkTarget, bulkDesignation, bulkEmployeeType]);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/hr/documents/templates', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setTemplates(await res.json());
    };

    const saveTemplate = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/hr/documents/templates', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(newTemplate)
        });
        if (res.ok) {
            setIsCreating(false);
            fetchTemplates();
            setNewTemplate({ title: '', type: 'OFFER_LETTER', content: '' });
        }
    };

    const loadPreset = (preset: any) => {
        setNewTemplate({
            title: preset.title,
            type: preset.type,
            content: preset.content
        });
        setIsCreating(true);
    };

    const issueDocument = async () => {
        if (!selectedTemplate) return;
        if (mode === 'SINGLE' && !selectedEmployee) return;

        const token = localStorage.getItem('token');
        let endpoint = '/api/hr/documents/issue';
        const body: any = { templateId: selectedTemplate };

        if (mode === 'SINGLE') {
            body.employeeId = selectedEmployee;
        } else {
            endpoint = '/api/hr/documents/issue-bulk';
            body.filters =
                bulkTarget === 'DESIGNATION' && bulkDesignation
                    ? { designation: bulkDesignation }
                    : bulkTarget === 'EMPLOYEE_TYPE' && bulkEmployeeType
                        ? { employeeType: bulkEmployeeType }
                        : { all: true };
        }

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            const data = await res.json();
            alert(mode === 'SINGLE' ? 'Document Issued Successfully!' : `Issued to ${data.total} employees!`);
            setSelectedTemplate('');
            setSelectedEmployee('');
            setBulkDesignation('');
            setBulkEmployeeType('');
        } else {
            alert('Failed to issue document');
        }
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* TEMPLATE MANAGER */}
                <div className="card-premium p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold">Document Templates</h3>
                            <p className="text-xs text-secondary-500">Manage formal document structures</p>
                        </div>
                        <button onClick={() => setIsCreating(!isCreating)} className="btn btn-sm btn-outline flex items-center gap-2">
                            {isCreating ? 'Cancel' : <><Plus size={16} /> New Template</>}
                        </button>
                    </div>

                    {!isCreating && (
                        <div className="mb-6 p-4 bg-primary-50 rounded-xl border border-primary-100">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h4 className="font-bold text-primary-800">🚀 Quick Start Presets</h4>
                                    <p className="text-[10px] text-primary-600">Select a standard preset to create a new template</p>
                                </div>
                                {templates.length > 0 && <span className="badge badge-primary">{templates.length} Active Templates</span>}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {HR_PRESETS.map((p, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => loadPreset(p)}
                                        className="text-left p-2 rounded-lg bg-white border border-primary-200 hover:bg-primary-100 transition-colors text-[10px] font-bold text-primary-700 flex items-center gap-2"
                                    >
                                        <Copy size={12} /> {p.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isCreating ? (
                        <div className="space-y-4 bg-secondary-50 p-6 rounded-2xl border-2 border-primary-100">
                            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-secondary-100 mb-4">
                                <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">New template configuration</span>
                                <div className="flex gap-2">
                                    <select
                                        className="select select-xs bg-secondary-50 font-bold border-none"
                                        onChange={(e) => {
                                            const preset = HR_PRESETS.find(p => p.title === e.target.value);
                                            if (preset) loadPreset(preset);
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Load from Preset...</option>
                                        {HR_PRESETS.map((p, idx) => <option key={idx} value={p.title}>{p.title}</option>)}
                                    </select>
                                </div>
                            </div>
                            <input
                                className="input w-full"
                                placeholder="Template Title"
                                value={newTemplate.title}
                                onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                            />
                            <select
                                className="input w-full"
                                value={newTemplate.type}
                                onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value })}
                            >
                                <option value="OFFER_LETTER">Offer Letter</option>
                                <option value="CONTRACT">Appointment Letter / Contract</option>
                                <option value="NDA">Non-Disclosure Agreement (NDA)</option>
                                <option value="RELIEVING_LETTER">Relieving Letter</option>
                                <option value="NOC">No Objection Certificate (NOC)</option>
                                <option value="POLICY">Policy Acknowledgement</option>
                            </select>
                            <div className="relative">
                                <span className="absolute right-2 top-2 text-[10px] bg-secondary-200 px-2 py-1 rounded text-secondary-600">HTML Supported</span>
                                <textarea
                                    className="input w-full h-40 font-mono text-xs"
                                    placeholder="HTML Content. Use {{name}}, {{role}}, {{salary}}, {{date}}"
                                    value={newTemplate.content}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-2 text-[10px] text-secondary-400 font-mono flex-wrap">
                                <span className="p-1 bg-white border rounded">{'{{name}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{designation}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{salary}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{joiningDate}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{employeeId}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{companyName}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{address}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{phone}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{panNumber}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{date}}'}</span>
                            </div>
                            <button onClick={saveTemplate} className="btn btn-primary w-full">Save Template</button>
                        </div>
                    ) : (
                        <div className="space-y-2 h-[300px] overflow-y-auto pr-2">
                            {templates.map(t => (
                                <div key={t.id} className="p-3 border rounded-lg hover:bg-secondary-50 cursor-pointer transition-colors flex justify-between items-center group">
                                    <div>
                                        <p className="font-bold text-sm">{t.title}</p>
                                        <span className="text-[10px] bg-secondary-200 px-2 rounded-full">{t.type}</span>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                                        <button
                                            onClick={() => setPreviewTemplateId(t.id)}
                                            className="text-secondary-400 hover:text-primary-600"
                                            title="Preview template"
                                        >
                                            <Eye size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ISSUANCE PANEL */}
                <div className="card-premium p-6 bg-gradient-to-br from-white to-primary-50">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Send size={20} className="text-primary-600" /> Issue Document
                        </h3>
                        <div className="flex bg-secondary-100/50 p-1 rounded-lg">
                            <button
                                onClick={() => setMode('SINGLE')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${mode === 'SINGLE' ? 'bg-white shadow text-primary-600' : 'text-secondary-500'}`}
                            >
                                Single
                            </button>
                            <button
                                onClick={() => setMode('BULK')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${mode === 'BULK' ? 'bg-white shadow text-primary-600' : 'text-secondary-500'}`}
                            >
                                Bulk
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="label">Select Template</label>
                            <select
                                className="input w-full bg-white"
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                            >
                                <option value="">-- Choose Document --</option>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </select>
                        </div>

                        {mode === 'SINGLE' ? (
                            <div>
                                <label className="label">Select Employee</label>
                                <select
                                    className="input w-full bg-white"
                                    value={selectedEmployee}
                                    onChange={(e) => setSelectedEmployee(e.target.value)}
                                >
                                    <option value="">-- Choose Employee --</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.user.email} ({e.designation})</option>)}
                                </select>
                            </div>
                        ) : (
                            <div className="p-4 bg-primary-50 border border-primary-200 rounded-xl">
                                <label className="label text-primary-800">Target Audience</label>
                                <div className="flex flex-wrap gap-4 mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={bulkTarget === 'ALL'} onChange={() => setBulkTarget('ALL')} className="radio radio-primary radio-sm" />
                                        <span className="text-sm font-bold">All Employees</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={bulkTarget === 'DESIGNATION'} onChange={() => setBulkTarget('DESIGNATION')} className="radio radio-primary radio-sm" />
                                        <span className="text-sm font-bold">By Designation</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={bulkTarget === 'EMPLOYEE_TYPE'} onChange={() => setBulkTarget('EMPLOYEE_TYPE')} className="radio radio-primary radio-sm" />
                                        <span className="text-sm font-bold">By Employee Type</span>
                                    </label>
                                </div>
                                {bulkTarget === 'DESIGNATION' && (
                                    <select
                                        className="input w-full bg-white mt-4"
                                        value={bulkDesignation}
                                        onChange={(e) => setBulkDesignation(e.target.value)}
                                    >
                                        <option value="">-- Choose Designation --</option>
                                        {designationOptions.map((designation) => (
                                            <option key={designation} value={designation}>{designation}</option>
                                        ))}
                                    </select>
                                )}
                                {bulkTarget === 'EMPLOYEE_TYPE' && (
                                    <select
                                        className="input w-full bg-white mt-4"
                                        value={bulkEmployeeType}
                                        onChange={(e) => setBulkEmployeeType(e.target.value)}
                                    >
                                        <option value="">-- Choose Employee Type --</option>
                                        {employeeTypeOptions.map((employeeType) => (
                                            <option key={employeeType} value={employeeType}>{employeeType.replace(/_/g, ' ')}</option>
                                        ))}
                                    </select>
                                )}
                                <p className="text-[10px] mt-2 text-primary-600">
                                    This will issue the selected document to <strong>{bulkTargetEmployees.length}</strong> active employees.
                                </p>
                            </div>
                        )}

                        {activeTemplate && sampleEmployee && (
                            <div className="rounded-2xl border border-secondary-200 bg-white overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-100 bg-secondary-50">
                                    <div>
                                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Live Preview</p>
                                        <p className="text-sm font-bold text-secondary-900">
                                            {activeTemplate.title} for {sampleEmployee.user?.name || sampleEmployee.user?.email || 'Sample Employee'}
                                        </p>
                                    </div>
                                    <span className="badge badge-primary">{mode}</span>
                                </div>
                                <div
                                    className="p-5 max-h-72 overflow-y-auto text-sm text-secondary-700 prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: hydrateTemplate(activeTemplate.content, sampleEmployee) }}
                                />
                            </div>
                        )}

                        <div className="p-4 bg-white/50 rounded-xl text-xs text-secondary-500 border border-primary-100">
                            <p className="font-bold mb-1">ℹ️ What happens next?</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>The system will hydrate the template with employee data (Name, Role, Salary).</li>
                                <li>A digital copy will be generated in their portal.</li>
                                <li>They will be prompted to digitally sign it.</li>
                            </ul>
                        </div>

                        <button
                            onClick={issueDocument}
                            disabled={
                                !selectedTemplate ||
                                (mode === 'SINGLE' && !selectedEmployee) ||
                                (mode === 'BULK' && bulkTarget === 'DESIGNATION' && !bulkDesignation) ||
                                (mode === 'BULK' && bulkTarget === 'EMPLOYEE_TYPE' && !bulkEmployeeType)
                            }
                            className="btn btn-primary w-full py-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Generate & Issue Document
                        </button>
                    </div>
                </div>
            </div>

            {previewTemplate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-secondary-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100 bg-secondary-50">
                            <div>
                                <h4 className="text-lg font-black text-secondary-900">{previewTemplate.title}</h4>
                                <p className="text-xs text-secondary-500">Template preview with sample employee data</p>
                            </div>
                            <button onClick={() => setPreviewTemplateId(null)} className="btn btn-sm btn-outline">Close</button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-88px)]">
                            <div className="mb-4 text-xs text-secondary-500">
                                Previewing as <strong>{sampleEmployee?.user?.name || sampleEmployee?.user?.email || 'Sample Employee'}</strong>
                            </div>
                            <div
                                className="prose prose-sm max-w-none text-secondary-700"
                                dangerouslySetInnerHTML={{ __html: hydrateTemplate(previewTemplate.content, sampleEmployee) }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
