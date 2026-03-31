'use client';

import React, { useState, useEffect, useCallback } from 'react';
import FocusableModal from '@/components/ui/FocusableModal';
import FormField from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { Settings, Info } from 'lucide-react';

interface LMSSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORY = 'LMS_MODULE';

export default function LMSSettingsModal({ isOpen, onClose }: LMSSettingsModalProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        LMS_INVOICE_COMPANY_ID: '',
        LMS_INVOICE_BRAND_ID: ''
    });

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/settings/configurations?category=${CATEGORY}&showValues=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setSettings(prev => {
                    const newSettings = { ...prev };
                    data.forEach((config: any) => {
                        if (config.key in newSettings) {
                            newSettings[config.key as keyof typeof newSettings] = config.value;
                        }
                    });
                    return newSettings;
                });
            }
        } catch (error) {
            console.error('Failed to fetch LMS settings', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchSettings();
        }
    }, [isOpen, fetchSettings]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            
            // Save both settings
            const savePromises = Object.entries(settings).map(([key, value]) => 
                fetch('/api/settings/configurations', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                        category: CATEGORY,
                        key,
                        value,
                        description: `LMS Module ${key.replace(/_/g, ' ')}`
                    })
                })
            );

            const results = await Promise.all(savePromises);
            const allOk = results.every(res => res.ok);

            if (allOk) {
                toast.success('LMS settings updated successfully');
                onClose();
            } else {
                toast.error('Some settings failed to save');
            }
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <FocusableModal
            isOpen={isOpen}
            onClose={onClose}
            title="LMS Module Settings"
            size="md"
        >
            <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-xl flex gap-3 border border-blue-100">
                    <Info className="text-blue-500 shrink-0" size={18} />
                    <p className="text-xs text-blue-700 leading-relaxed font-medium">
                        These IDs determine which legal entity (Company) and visual identity (Brand) 
                        are used for invoices generated through the LMS module (e.g. Nanoschool workshop registrations).
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-2 ml-1">
                            Default Company ID
                        </label>
                        <input
                            type="text"
                            className="w-full input"
                            value={settings.LMS_INVOICE_COMPANY_ID}
                            onChange={e => setSettings(prev => ({ ...prev, LMS_INVOICE_COMPANY_ID: e.target.value }))}
                            placeholder="3a148605-aa1c-42b4-8ab8-f78c039ee9c0"
                        />
                        <p className="text-[10px] text-secondary-400 mt-1.5 ml-1 italic font-medium">
                            System Default: 3a148605-aa1c-42b4-8ab8-f78c039ee9c0 (Nanoschool)
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-2 ml-1">
                            Default Brand ID
                        </label>
                        <input
                            type="text"
                            className="w-full input"
                            value={settings.LMS_INVOICE_BRAND_ID}
                            onChange={e => setSettings(prev => ({ ...prev, LMS_INVOICE_BRAND_ID: e.target.value }))}
                            placeholder="fbb632ae"
                        />
                        <p className="text-[10px] text-secondary-400 mt-1.5 ml-1 italic font-medium">
                            System Default: fbb632ae
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-secondary-100">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        isLoading={saving}
                        onClick={handleSave}
                        disabled={loading}
                    >
                        Save Changes
                    </Button>
                </div>
            </div>
        </FocusableModal>
    );
}
