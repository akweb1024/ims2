'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Plus, ListTodo, FileText, CheckCircle, Eye, Edit } from 'lucide-react';
import ScreeningTemplateBuilderModal from '@/components/dashboard/hr/screening/ScreeningTemplateBuilderModal';
import { fetchJson } from '@/lib/api-utils';
import { toast } from 'react-hot-toast';

export default function ScreeningTemplatesPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBuilder, setShowBuilder] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const res = await fetchJson('/api/recruitment/templates');
            setTemplates(Array.isArray(res) ? res : []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                            <ListTodo className="h-8 w-8 text-primary-600" />
                            Screening Templates
                        </h1>
                        <p className="text-gray-500 font-medium mt-1">Manage interview scorecards and evaluation rubrics.</p>
                    </div>
                    <button
                        onClick={() => { setEditingTemplate(null); setShowBuilder(true); }}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary-200 transition-all active:scale-95"
                    >
                        <Plus size={18} /> New Template
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center">
                        <div className="h-20 w-20 bg-primary-50 text-primary-500 rounded-full flex items-center justify-center mb-4">
                            <FileText size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Templates Yet</h3>
                        <p className="text-gray-500 mb-6 max-w-md">Create your first screening template to standardize interview evaluations across departments.</p>
                        <button
                            onClick={() => { setEditingTemplate(null); setShowBuilder(true); }}
                            className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-xl font-bold"
                        >
                            Create Template
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map(t => (
                            <div key={t.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-lg transition-all group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-purple-50 text-primary-600 rounded-xl">
                                        <CheckCircle size={24} />
                                    </div>
                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                        <button onClick={() => { setEditingTemplate(t); setShowBuilder(true); }} className="p-1.5 hover:bg-white rounded text-gray-500 hover:text-primary-600 transition-colors">
                                            <Edit size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{t.title}</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Version {t.version}</p>
                                
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-gray-600">
                                        <span className="font-medium">Department</span>
                                        <span className="font-bold text-gray-900">{t.department || 'All'}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span className="font-medium">Questions</span>
                                        <span className="font-bold text-gray-900">{t.questions?.length || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span className="font-medium">Categories</span>
                                        <span className="font-bold text-gray-900">{t.categories?.length || 0}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showBuilder && (
                <ScreeningTemplateBuilderModal
                    template={editingTemplate}
                    onClose={() => setShowBuilder(false)}
                    onSaved={() => { setShowBuilder(false); loadTemplates(); }}
                />
            )}
        </DashboardLayout>
    );
}
