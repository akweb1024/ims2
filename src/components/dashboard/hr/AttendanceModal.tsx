'use client';

import { useState } from 'react';

interface AttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: any;
    onSave: (data: any) => Promise<void>;
}

export default function AttendanceModal({ isOpen, onClose, initialData, onSave }: AttendanceModalProps) {
    const [attendanceForm, setAttendanceForm] = useState({
        id: initialData?.id || '',
        checkIn: initialData?.checkIn || '',
        checkOut: initialData?.checkOut || '',
        status: initialData?.status || 'PRESENT'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(attendanceForm);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                <div className="bg-secondary-50 p-6 border-b border-secondary-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-secondary-900">Correct Attendance</h3>
                    <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-4">
                    <div>
                        <label className="label-premium">Check In Time</label>
                        <input type="datetime-local" className="input-premium" value={attendanceForm.checkIn} onChange={e => setAttendanceForm({ ...attendanceForm, checkIn: e.target.value })} />
                    </div>
                    <div>
                        <label className="label-premium">Check Out Time</label>
                        <input type="datetime-local" className="input-premium" value={attendanceForm.checkOut} onChange={e => setAttendanceForm({ ...attendanceForm, checkOut: e.target.value })} />
                    </div>
                    <div>
                        <label className="label-premium">Status</label>
                        <select className="input-premium" value={attendanceForm.status} onChange={e => setAttendanceForm({ ...attendanceForm, status: e.target.value })}>
                            <option value="PRESENT">Present</option>
                            <option value="ABSENT">Absent</option>
                            <option value="LEAVE">On Leave</option>
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary w-full py-4 text-sm font-black uppercase tracking-widest shadow-lg">Update Record</button>
                </form>
            </div>
        </div>
    );
}
