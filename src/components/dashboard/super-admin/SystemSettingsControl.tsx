
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Settings, ShieldAlert, Mail, Globe, Palette, Info } from "lucide-react";

interface SystemSettings {
    maintenanceMode: boolean;
    supportEmail: string;
    defaultCurrency: string;
    companyName: string;
    brandName: string | null;
    primaryColor: string | null;
}

export default function SystemSettingsControl({ settings }: { settings: SystemSettings | null }) {
    if (!settings) return null;

    return (
        <Card className="border-secondary-200 shadow-sm">
            <CardHeader className="pb-2 border-b border-secondary-100">
                <CardTitle className="text-lg font-black text-secondary-900 flex items-center gap-2">
                    <Settings className="text-primary-500" size={20} />
                    Global System Control
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                {/* Maintenance Mode Toggle Placeholder */}
                <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-xl border border-secondary-100">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.maintenanceMode ? 'bg-danger-100 text-danger-600' : 'bg-success-100 text-success-600'}`}>
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-secondary-900">Maintenance Mode</p>
                            <p className="text-[10px] text-secondary-500">Enable to block all non-admin access</p>
                        </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${settings.maintenanceMode ? 'bg-danger-500' : 'bg-secondary-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.maintenanceMode ? 'right-1' : 'left-1'}`} />
                    </div>
                </div>

                {/* System Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Mail className="text-secondary-400" size={16} />
                            <div>
                                <p className="text-[10px] font-black text-secondary-400 uppercase">Support Email</p>
                                <p className="text-sm font-medium text-secondary-900">{settings.supportEmail}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Globe className="text-secondary-400" size={16} />
                            <div>
                                <p className="text-[10px] font-black text-secondary-400 uppercase">Primary Currency</p>
                                <p className="text-sm font-medium text-secondary-900 font-mono">{settings.defaultCurrency}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Palette className="text-secondary-400" size={16} />
                            <div>
                                <p className="text-[10px] font-black text-secondary-400 uppercase">Primary Brand Color</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded border border-secondary-200" style={{ backgroundColor: settings.primaryColor || '#3b82f6' }} />
                                    <p className="text-sm font-medium text-secondary-900 uppercase font-mono">{settings.primaryColor || '#3B82F6'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Info className="text-secondary-400" size={16} />
                            <div>
                                <p className="text-[10px] font-black text-secondary-400 uppercase">Company Name</p>
                                <p className="text-sm font-medium text-secondary-900">{settings.companyName}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex flex-col gap-2">
                    <button className="btn-secondary w-full py-2 text-xs font-black uppercase tracking-widest">
                        Configure Whitelabeling
                    </button>
                    <button className="btn-primary w-full py-2 text-xs font-black uppercase tracking-widest">
                        Save Global Changes
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}
