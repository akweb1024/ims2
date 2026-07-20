'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Building2, Globe2, Search, Send, User, Users, X } from 'lucide-react';

type ScopeKind = 'USERS' | 'TEAM' | 'COMPANY' | 'GLOBAL';

interface StaffOption {
    id: string; // User id
    name: string | null;
    email: string;
    companyName?: string;
    department?: { name: string } | null;
}

interface CompanyOption {
    id: string;
    name: string;
}

interface NotificationComposerProps {
    onClose: () => void;
    /** Preselect a scope (e.g. from a drill-down context). */
    initialScope?: ScopeKind;
    initialUserIds?: string[];
    initialManagerId?: string;
    initialCompanyId?: string;
}

const SCOPES: Array<{ kind: ScopeKind; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; hint: string }> = [
    { kind: 'USERS', label: 'Individuals', icon: User, hint: 'Pick one or more people' },
    { kind: 'TEAM', label: 'Team', icon: Users, hint: 'A manager and everyone reporting to them' },
    { kind: 'COMPANY', label: 'Company', icon: Building2, hint: 'All staff of one company' },
    { kind: 'GLOBAL', label: 'Everyone', icon: Globe2, hint: 'All staff across all companies' },
];

// Compose and send an in-app (+push) notification to individuals, a team, a
// company, or the whole group via POST /api/notifications/send.
export default function NotificationComposer({
    onClose,
    initialScope = 'USERS',
    initialUserIds = [],
    initialManagerId = '',
    initialCompanyId = '',
}: NotificationComposerProps) {
    const [scope, setScope] = useState<ScopeKind>(initialScope);
    const [staff, setStaff] = useState<StaffOption[]>([]);
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>(initialUserIds);
    const [managerId, setManagerId] = useState(initialManagerId);
    const [companyId, setCompanyId] = useState(initialCompanyId);
    const [search, setSearch] = useState('');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [link, setLink] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [sentCount, setSentCount] = useState<number | null>(null);

    const [role, setRole] = useState<string>('');
    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            setRole(stored.role || '');
        } catch { /* role stays unknown; server still enforces */ }
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/hr/employees?format=staff');
                if (res.ok) {
                    const rows = await res.json();
                    setStaff(Array.isArray(rows) ? rows : []);
                }
            } catch { /* pickers degrade to empty */ }
            try {
                const res = await fetch('/api/companies?limit=100');
                if (res.ok) {
                    const data = await res.json();
                    setCompanies((data.data || []).map((c: any) => ({ id: c.id, name: c.name })));
                }
            } catch { /* pickers degrade to empty */ }
        })();
    }, []);

    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role);
    const visibleScopes = SCOPES.filter((s) => {
        if (s.kind === 'GLOBAL') return role === 'SUPER_ADMIN';
        if (s.kind === 'COMPANY') return isAdmin;
        return true;
    });

    const filteredStaff = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return staff;
        return staff.filter((s) =>
            (s.name || '').toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
        );
    }, [staff, search]);

    const toggleUser = (id: string) => {
        setSelectedUserIds((prev) =>
            prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
        );
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSending(true);
        try {
            const body: Record<string, unknown> = { scope, title, message };
            if (link.trim()) body.link = link.trim();
            if (scope === 'USERS') body.userIds = selectedUserIds;
            if (scope === 'TEAM') body.managerId = managerId;
            if (scope === 'COMPANY') body.companyId = companyId;

            const res = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setSentCount(data.recipients ?? 0);
            } else {
                setError(data.error || 'Failed to send notification');
            }
        } catch {
            setError('Network error while sending notification');
        } finally {
            setSending(false);
        }
    };

    const canSubmit =
        title.trim() && message.trim() &&
        (scope === 'GLOBAL' ||
            (scope === 'USERS' && selectedUserIds.length > 0) ||
            (scope === 'TEAM' && managerId) ||
            (scope === 'COMPANY' && companyId));

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                <div className="bg-secondary-50 p-6 border-b border-secondary-100 flex justify-between items-center sticky top-0">
                    <h3 className="text-lg font-bold text-secondary-900 flex items-center gap-2">
                        <Bell size={18} className="text-primary-600" /> Send Notification
                    </h3>
                    <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600 transition-colors" title="Close">
                        <X size={18} />
                    </button>
                </div>

                {sentCount !== null ? (
                    <div className="p-8 text-center space-y-4">
                        <p className="text-lg font-bold text-secondary-900">
                            Notification sent to {sentCount} {sentCount === 1 ? 'person' : 'people'}.
                        </p>
                        <p className="text-sm text-secondary-500">
                            It appears in their notification bell now and as a push notification where enabled.
                        </p>
                        <button onClick={onClose} className="btn btn-primary">Done</button>
                    </div>
                ) : (
                    <form onSubmit={handleSend} className="p-6 space-y-5">
                        <div>
                            <label className="label-premium">Audience</label>
                            <div className="grid grid-cols-2 gap-2">
                                {visibleScopes.map(({ kind, label, icon: Icon, hint }) => (
                                    <button
                                        type="button"
                                        key={kind}
                                        onClick={() => setScope(kind)}
                                        className={`p-3 rounded-xl border text-left transition-all ${scope === kind ? 'border-primary-500 bg-primary-50' : 'border-secondary-200 hover:border-secondary-300'}`}
                                    >
                                        <span className="flex items-center gap-1.5 text-sm font-bold text-secondary-900">
                                            <Icon size={14} className={scope === kind ? 'text-primary-600' : 'text-secondary-400'} /> {label}
                                        </span>
                                        <span className="block text-[11px] text-secondary-500 mt-0.5">{hint}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {scope === 'USERS' && (
                            <div>
                                <label className="label-premium">Recipients ({selectedUserIds.length} selected)</label>
                                <div className="relative mb-2">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search people..."
                                        className="input-premium pl-8 text-sm"
                                    />
                                </div>
                                <div className="border border-secondary-200 rounded-xl max-h-44 overflow-y-auto divide-y divide-secondary-50">
                                    {filteredStaff.map((person) => (
                                        <label key={person.id} className="flex items-center gap-2 p-2.5 text-sm cursor-pointer hover:bg-secondary-50">
                                            <input
                                                type="checkbox"
                                                checked={selectedUserIds.includes(person.id)}
                                                onChange={() => toggleUser(person.id)}
                                            />
                                            <span className="font-medium text-secondary-900 truncate">{person.name || person.email}</span>
                                            <span className="text-xs text-secondary-400 truncate ml-auto">{person.companyName}</span>
                                        </label>
                                    ))}
                                    {!filteredStaff.length && (
                                        <p className="p-3 text-xs text-secondary-400 italic">No people found.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {scope === 'TEAM' && (
                            <div>
                                <label className="label-premium">Team (choose the manager)</label>
                                <select
                                    className="input-premium"
                                    value={managerId}
                                    onChange={(e) => setManagerId(e.target.value)}
                                    title="Team manager"
                                >
                                    <option value="">Select a manager...</option>
                                    {staff.map((person) => (
                                        <option key={person.id} value={person.id}>
                                            {person.name || person.email}{person.companyName ? ` — ${person.companyName}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-secondary-400 mt-1">Delivered to the manager and everyone in their reporting line.</p>
                            </div>
                        )}

                        {scope === 'COMPANY' && (
                            <div>
                                <label className="label-premium">Company</label>
                                <select
                                    className="input-premium"
                                    value={companyId}
                                    onChange={(e) => setCompanyId(e.target.value)}
                                    title="Company"
                                >
                                    <option value="">Select a company...</option>
                                    {companies.map((company) => (
                                        <option key={company.id} value={company.id}>{company.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {scope === 'GLOBAL' && (
                            <p className="text-xs font-bold text-warning-700 bg-warning-50 border border-warning-100 rounded-xl p-3">
                                This reaches every active staff member in every company.
                            </p>
                        )}

                        <div>
                            <label className="label-premium">Title <span className="text-red-500">*</span></label>
                            <input
                                className="input-premium"
                                required
                                maxLength={200}
                                placeholder="e.g. Monthly all-hands on Friday"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="label-premium">Message <span className="text-red-500">*</span></label>
                            <textarea
                                className="input-premium"
                                required
                                rows={3}
                                maxLength={2000}
                                placeholder="What do people need to know?"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="label-premium">Link (optional)</label>
                            <input
                                className="input-premium"
                                placeholder="/dashboard/..."
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                            />
                            <p className="text-xs text-secondary-400 mt-1">An in-app path the notification opens when clicked.</p>
                        </div>

                        {error && <p className="text-sm text-danger-600">{error}</p>}

                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                            <button
                                type="submit"
                                disabled={!canSubmit || sending}
                                className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
                            >
                                <Send size={15} /> {sending ? 'Sending...' : 'Send Notification'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
