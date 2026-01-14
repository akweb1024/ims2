import { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { useHolidays, useHolidayMutations } from '@/hooks/useHR';

export default function HolidayManager({ userRole }: { userRole?: string }) {
    const { data: holidays = [] } = useHolidays();
    const { create, update, remove } = useHolidayMutations();
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [selectedHoliday, setSelectedHoliday] = useState<any>(null);
    const [holidayForm, setHolidayForm] = useState({
        name: '',
        date: new Date().toISOString().split('T')[0],
        type: 'PUBLIC',
        description: ''
    });

    const handleHolidaySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedHoliday) {
                await update.mutateAsync({ ...holidayForm, id: selectedHoliday.id });
            } else {
                await create.mutateAsync(holidayForm);
            }
            setShowHolidayModal(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteHoliday = async (id: string) => {
        if (!confirm('Are you sure you want to delete this holiday?')) return;
        try {
            await remove.mutateAsync(id);
        } catch (err) {
            console.error(err);
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h3 className="text-2xl font-black text-secondary-900 tracking-tighter uppercase">Holiday Almanac</h3>
                    <p className="text-secondary-500 font-medium">Official non-operational schedule.</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedHoliday(null);
                        setHolidayForm({ name: '', date: new Date().toISOString().split('T')[0], type: 'PUBLIC', description: '' });
                        setShowHolidayModal(true);
                    }}
                    className="btn btn-primary text-xs font-black uppercase tracking-widest shadow-lg"
                >
                    + Add Holiday
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {holidays.map((h: any) => (
                    <div key={h.id} className="card-premium p-6 border-l-4 group relative hover:-translate-y-1 transition-transform duration-300" style={{ borderColor: h.type === 'PUBLIC' ? '#2563eb' : '#7c3aed' }}>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => {
                                setSelectedHoliday(h);
                                setHolidayForm({ name: h.name, date: new Date(h.date).toISOString().split('T')[0], type: h.type, description: h.description || '' });
                                setShowHolidayModal(true);
                            }} className="p-1.5 bg-secondary-100 rounded hover:bg-white hover:text-primary-600 text-secondary-500">
                                <Edit size={12} />
                            </button>
                            <button onClick={() => handleDeleteHoliday(h.id)} className="p-1.5 bg-secondary-100 rounded hover:bg-white hover:text-danger-600 text-secondary-500">
                                <Trash2 size={12} />
                            </button>
                        </div>
                        <p className="text-xs font-black text-secondary-400 uppercase mb-2">{new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}</p>
                        <h4 className="font-black text-secondary-900">{h.name}</h4>
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-[10px] font-bold text-secondary-400 uppercase">{h.type}</p>
                            {h.company?.name && (
                                <span className="text-[9px] font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full uppercase">
                                    {h.company.name}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Holiday Modal */}
            {showHolidayModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                        <div className="bg-secondary-50 p-6 border-b border-secondary-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-secondary-900">{selectedHoliday ? 'Edit Holiday' : 'Add Holiday'}</h3>
                            <button onClick={() => setShowHolidayModal(false)} className="text-secondary-400 hover:text-secondary-600">✕</button>
                        </div>
                        <form onSubmit={handleHolidaySubmit} className="p-6 space-y-4">
                            <div>
                                <label className="label-premium">Holiday Name</label>
                                <input type="text" className="input-premium" required value={holidayForm.name} onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="e.g. Independence Day" />
                            </div>
                            <div>
                                <label className="label-premium">Date</label>
                                <input type="date" className="input-premium" required value={holidayForm.date} onChange={e => setHolidayForm({ ...holidayForm, date: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Type</label>
                                <select className="input-premium" value={holidayForm.type} onChange={e => setHolidayForm({ ...holidayForm, type: e.target.value })}>
                                    <option value="PUBLIC">Public Holiday</option>
                                    <option value="OPTIONAL">Optional / Restricted</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-premium">Description (Optional)</label>
                                <textarea className="input-premium" rows={3} value={holidayForm.description} onChange={e => setHolidayForm({ ...holidayForm, description: e.target.value })} />
                            </div>
                            <div className="pt-4 flex gap-4">
                                <button type="submit" className="flex-1 btn btn-primary py-3 text-sm font-bold uppercase tracking-widest">{selectedHoliday ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
