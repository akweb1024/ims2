'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronRight, Search, User, Users } from 'lucide-react';
import type { StaffRow } from './MDControlCenter';

interface EmployeeExplorerProps {
    staff: StaffRow[];
    loading: boolean;
    onSelect: (userId: string) => void;
}

function Avatar({ person }: { person: StaffRow }) {
    return (
        <div className="relative w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center text-sm font-bold text-primary-600 overflow-hidden shrink-0">
            {person.profilePicture ? (
                <Image src={person.profilePicture} alt="" fill className="object-cover" />
            ) : (
                (person.name?.[0] || person.email[0]).toUpperCase()
            )}
        </div>
    );
}

function EmployeeRow({ person, onSelect }: { person: StaffRow; onSelect: (userId: string) => void }) {
    return (
        <button
            onClick={() => onSelect(person.id)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary-50/50 transition-colors text-left group"
        >
            <Avatar person={person} />
            <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-secondary-900 truncate group-hover:text-primary-700">
                    {person.name || person.email}
                </p>
                <p className="text-xs text-secondary-500 truncate">
                    {person.designation?.title || 'No designation'}
                    {person.department?.name && ` • ${person.department.name}`}
                </p>
            </div>
            {person.status !== 'ACTIVE' && (
                <span className="text-[10px] font-black uppercase text-danger-600 bg-danger-50 px-2 py-0.5 rounded-full shrink-0">Inactive</span>
            )}
            <ChevronRight size={16} className="text-secondary-300 group-hover:text-primary-500 shrink-0" />
        </button>
    );
}

// A "team" is a manager plus everyone reporting to them — TeamMember rows are
// manager↔member joins, there is no named team entity to list instead.
export default function EmployeeExplorer({ staff, loading, onSelect }: EmployeeExplorerProps) {
    const [mode, setMode] = useState<'employees' | 'teams'>('employees');
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return staff;
        return staff.filter((s) =>
            (s.name || '').toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q) ||
            (s.designation?.title || '').toLowerCase().includes(q)
        );
    }, [staff, search]);

    const teams = useMemo(() => {
        const byManager = new Map<string, { manager: { id: string; name: string | null }; members: StaffRow[] }>();
        const unassigned: StaffRow[] = [];
        for (const person of filtered) {
            if (person.manager?.id) {
                const entry = byManager.get(person.manager.id) || { manager: person.manager, members: [] };
                entry.members.push(person);
                byManager.set(person.manager.id, entry);
            } else {
                unassigned.push(person);
            }
        }
        return {
            groups: [...byManager.values()].sort((a, b) => b.members.length - a.members.length),
            unassigned,
        };
    }, [filtered]);

    if (loading) {
        return <div className="p-12 text-center text-secondary-400">Loading employees...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex rounded-xl border border-secondary-200 overflow-hidden">
                    {(['employees', 'teams'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-4 py-2 text-sm font-bold capitalize flex items-center gap-1.5 ${mode === m ? 'bg-primary-600 text-white' : 'bg-white text-secondary-600 hover:bg-secondary-50'}`}
                        >
                            {m === 'employees' ? <User size={14} /> : <Users size={14} />} {m}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, email or designation"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-secondary-200 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                </div>
                <span className="text-xs text-secondary-400 font-bold ml-auto">{filtered.length} people</span>
            </div>

            {!filtered.length ? (
                <div className="p-12 text-center text-secondary-400">No employees match.</div>
            ) : mode === 'employees' ? (
                <div className="card-premium p-2 divide-y divide-secondary-50">
                    {filtered.map((person) => (
                        <EmployeeRow key={person.id} person={person} onSelect={onSelect} />
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {teams.groups.map(({ manager, members }) => (
                        <div key={manager.id} className="card-premium p-4">
                            <div className="flex items-center justify-between mb-2">
                                <button
                                    onClick={() => onSelect(manager.id)}
                                    className="font-bold text-sm text-secondary-900 hover:text-primary-700"
                                >
                                    {manager.name || 'Unnamed manager'}&apos;s team
                                </button>
                                <span className="text-xs text-secondary-400 font-bold">{members.length} members</span>
                            </div>
                            <div className="divide-y divide-secondary-50">
                                {members.map((person) => (
                                    <EmployeeRow key={person.id} person={person} onSelect={onSelect} />
                                ))}
                            </div>
                        </div>
                    ))}
                    {teams.unassigned.length > 0 && (
                        <div className="card-premium p-4">
                            <p className="font-bold text-sm text-secondary-500 mb-2">No manager assigned</p>
                            <div className="divide-y divide-secondary-50">
                                {teams.unassigned.map((person) => (
                                    <EmployeeRow key={person.id} person={person} onSelect={onSelect} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
