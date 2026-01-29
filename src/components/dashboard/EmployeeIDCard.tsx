'use client';

import { useState, useRef } from 'react';
import { Camera, Download, Printer, User as UserIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import Image from 'next/image';

export default function EmployeeIDCard({ employee }: { employee: any }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [uploading, setUploading] = useState(false);
    const [photo, setPhoto] = useState<string | null>(employee.profilePicture || null);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setUploading(true);

        const formData = new FormData();
        formData.append('file', e.target.files[0]);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/profile/upload-photo', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                setPhoto(data.url);
                alert('Photo Updated Successfully!');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to upload photo');
        } finally {
            setUploading(false);
        }
    };

    const downloadCard = async () => {
        if (cardRef.current) {
            const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: null });
            const link = document.createElement('a');
            link.download = `ID-Card-${employee.employeeId}.png`;
            link.href = canvas.toDataURL();
            link.click();
        }
    };

    return (
        <div className="flex flex-col xl:flex-row items-center justify-center gap-10 p-8 min-h-[600px] bg-secondary-50/50">

            {/* ID CARD VISUAL */}
            <div className="relative group perspective-1000">
                <div
                    ref={cardRef}
                    style={{ '--bg-url': 'url("/patterns/map-grid.svg")' } as React.CSSProperties}
                    className="w-[350px] h-[580px] bg-white rounded-3xl shadow-2xl relative overflow-hidden border border-secondary-200 [background-image:var(--bg-url)] [background-size:cover]"
                >
                    {/* Header */}
                    <div className="h-32 bg-primary-600 relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 opacity-90"></div>
                        <div className="relative z-10 text-center w-full px-4">
                            <h2 className="text-xl font-black text-white uppercase tracking-widest truncate">
                                {employee.user.company?.name || employee.user.companies?.[0]?.name || 'STM Journals'}
                            </h2>
                            <p className="text-[10px] text-primary-100 uppercase tracking-widest font-bold">Identity Card</p>
                        </div>
                        {/* Decorative Circles */}
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                    </div>

                    {/* Photo */}
                    <div className="relative -mt-16 mx-auto w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-secondary-100 group-hover:scale-105 transition-transform duration-300">
                        {photo ? (
                            <Image
                                src={photo}
                                alt="Profile"
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-secondary-300">
                                <UserIcon size={48} />
                            </div>
                        )}

                        {/* Upload Overlay */}
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white" title="Change Profile Photo">
                            <Camera size={24} />
                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} title="Profile Photo Upload" />
                        </label>
                    </div>

                    <div className="text-center mt-4 px-6 space-y-1">
                        <h3 className="text-2xl font-bold text-secondary-900 leading-tight">{employee.user.name || employee.user.email.split('@')[0]}</h3>
                        <p className="text-sm font-bold text-primary-600 uppercase tracking-wider">{employee.designatRef?.name || employee.designation || 'Specialist'}</p>
                        <div className="flex justify-center gap-2 mt-2">
                            <span className="px-2 py-1 bg-secondary-100 rounded text-[10px] font-mono text-secondary-600">ID: {employee.employeeId || 'N/A'}</span>
                            {employee.bloodGroup && <span className="px-2 py-1 bg-danger-50 text-danger-600 rounded text-[10px] font-bold">🩸 {employee.bloodGroup}</span>}
                        </div>
                    </div>

                    <div className="mt-6 px-8 space-y-3">
                        <div className="flex items-start gap-4 text-xs text-secondary-600 border-b border-secondary-100 pb-2">
                            <span className="font-bold w-20 uppercase text-[10px] text-secondary-400">Department</span>
                            <span className="flex-1 truncate font-medium">{employee.user.department?.name || 'N/A'}</span>
                        </div>
                        <div className="flex items-start gap-4 text-xs text-secondary-600 border-b border-secondary-100 pb-2">
                            <span className="font-bold w-20 uppercase text-[10px] text-secondary-400">Join Date</span>
                            <span className="flex-1 font-medium">{employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : '--'}</span>
                        </div>
                        <div className="flex items-start gap-4 text-xs text-secondary-600 border-b border-secondary-100 pb-2">
                            <span className="font-bold w-20 uppercase text-[10px] text-secondary-400">Exp.</span>
                            <span className="flex-1 font-medium">{employee.calculatedTotalExperience || '0 years'}</span>
                        </div>
                        <div className="flex items-start gap-4 text-xs text-secondary-600 border-b border-secondary-100 pb-2">
                            <span className="font-bold w-20 uppercase text-[10px] text-secondary-400">Mobile</span>
                            <span className="flex-1 font-medium">{employee.phoneNumber || '--'}</span>
                        </div>
                    </div>

                    {/* Footer / QR */}
                    <div className="absolute bottom-6 left-0 right-0 text-center">
                        <div className="w-14 h-14 bg-white mx-auto p-1 rounded shadow-sm">
                            {/* Simple simulated QR */}
                            <div
                                className="w-full h-full bg-secondary-900 [background-size:cover] [background-image:var(--qr-url)]"
                                style={{ '--qr-url': `url("https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${employee.employeeId || employee.user.email}")` } as React.CSSProperties}
                                title="Employee ID QR Code"
                            />
                        </div>
                        <p className="text-[8px] text-secondary-400 mt-2 font-mono uppercase tracking-widest">{employee.user.company?.website || 'stmjournals.com'}</p>
                    </div>
                </div>
            </div>

            {/* CONTROLS */}
            <div className="flex flex-col gap-4">
                <div className="card-premium p-6 w-80">
                    <h3 className="font-bold text-lg mb-4">Actions</h3>
                    <div className="space-y-3">
                        <button onClick={downloadCard} className="btn btn-primary w-full flex items-center justify-center gap-2">
                            <Download size={16} /> Download ID Card
                        </button>
                        <button onClick={() => window.print()} className="btn btn-secondary w-full flex items-center justify-center gap-2">
                            <Printer size={16} /> Print
                        </button>
                    </div>
                    <p className="text-xs text-secondary-400 mt-4 text-center">
                        Ensure your profile photo is professional. This card is valid for official use.
                    </p>
                </div>

                <div className="card bg-secondary-50 border border-secondary-100 p-4 w-80">
                    <h4 className="font-bold text-sm mb-2">Missing Info?</h4>
                    <p className="text-xs text-secondary-500 mb-2">If any details are incorrect, please update your profile or contact HR.</p>
                </div>
            </div>

        </div>
    );
}
