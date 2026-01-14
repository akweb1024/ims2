import { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { useDepartments, useDepartmentMutations } from '@/hooks/useHR';

export default function DepartmentManager({ userRole }: { userRole?: string }) {
    const { data: departments = [] } = useDepartments();
    const { create, update, remove } = useDepartmentMutations();
    const [showModal, setShowModal] = useState(false);
    const [selectedDept, setSelectedDept] = useState<any>(null);
    const [deptForm, setDeptForm] = useState({
        name: '',
        code: '',
        description: ''
    });

    const isAuthorized = ['SUPER_ADMIN', 'ADMIN'].includes(userRole || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedDept) {
                await update.mutateAsync({ ...deptForm, id: selectedDept.id });
            } else {
                await create.mutateAsync(deptForm);
            }
            setShowModal(false);
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to save department');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this department? This only works if no employees are assigned to it.')) return;
        try {
            await remove.mutateAsync(id);
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to delete department. Make sure it has no employees.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h3 className="text-2xl font-black text-secondary-900 tracking-tighter uppercase">Department Master</h3>
                    <p className="text-secondary-500 font-medium">Manage organization structure and divisions.</p>
                </div>
                {isAuthorized && (
                    <button
                        onClick={() => {
                            setSelectedDept(null);
                            setDeptForm({ name: '', code: '', description: '' });
                            setShowModal(true);
                        }}
                        className="btn btn-primary text-xs font-black uppercase tracking-widest shadow-lg"
                    >
                        + Create Department
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {departments.length === 0 ? (
                    <div className="col-span-full py-20 text-center card-premium text-secondary-400 italic">
                        No departments found. Create one to get started.
                    </div>
                ) : departments.map((dept: any) => (
                    <div key={dept.id} className="card-premium p-6 border-l-4 border-primary-500 group relative hover:-translate-y-1 transition-all duration-300">
                        {isAuthorized && (
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => {
                                    setSelectedDept(dept);
                                    setDeptForm({ name: dept.name, code: dept.code || '', description: dept.description || '' });
                                    setShowModal(true);
                                }} className="p-1.5 bg-secondary-100 rounded hover:bg-white hover:text-primary-600 text-secondary-500">
                                    <Edit size={12} />
                                </button>
                                <button onClick={() => handleDelete(dept.id)} className="p-1.5 bg-secondary-100 rounded hover:bg-white hover:text-danger-600 text-secondary-500">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        )}
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">{dept.code || 'NO CODE'}</p>
                        <h4 className="font-black text-secondary-900 text-xl">{dept.name}</h4>
                        {dept.description && <p className="text-xs text-secondary-500 mt-2 line-clamp-2 italic leading-relaxed">&quot;{dept.description}&quot;</p>}

                        <div className="mt-4 pt-4 border-t border-secondary-50 flex justify-between items-center">
                            <span className="text-[9px] font-bold text-secondary-400 uppercase">{dept.company?.name || 'Division'}</span>
                            <span className="badge badge-secondary text-[9px]">{dept.company ? 'Corporate' : 'Internal'}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Department Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                        <div className="bg-secondary-50 p-6 border-b border-secondary-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-secondary-900">{selectedDept ? 'Edit Department' : 'Create Department'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-secondary-400 hover:text-secondary-600">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="label-premium">Department Name</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    required
                                    value={deptForm.name}
                                    onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                                    placeholder="e.g. Engineering, Sales, HR"
                                />
                            </div>
                            <div>
                                <label className="label-premium">Code (Optional)</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    value={deptForm.code}
                                    onChange={e => setDeptForm({ ...deptForm, code: e.target.value })}
                                    placeholder="e.g. ENG, SALES"
                                />
                            </div>
                            <div>
                                <label className="label-premium">Description (Optional)</label>
                                <textarea
                                    className="input-premium"
                                    rows={3}
                                    value={deptForm.description}
                                    onChange={e => setDeptForm({ ...deptForm, description: e.target.value })}
                                    placeholder="Briefly describe the department's role..."
                                />
                            </div>
                            <div className="pt-4 flex gap-4">
                                <button type="submit" className="flex-1 btn btn-primary py-3 text-sm font-bold uppercase tracking-widest">
                                    {selectedDept ? 'Update Details' : 'Initialize Division'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
