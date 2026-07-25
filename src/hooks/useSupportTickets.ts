import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const fetchJson = async (url: string, method: string = 'GET', body?: any) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const e: any = new Error(err.message || err.error || `API Error: ${res.statusText}`);
        e.status = res.status;
        throw e;
    }
    return res.json();
};

export type TicketScope = 'mine' | 'assigned' | 'queue';

export const useTickets = (scope?: TicketScope) =>
    useQuery({
        queryKey: ['support-tickets', scope ?? 'default'],
        queryFn: () => fetchJson(`/api/it/tickets${scope ? `?scope=${scope}` : ''}`),
        select: (d: any) => (Array.isArray(d) ? d : []),
    });

export const useTicket = (id: string) =>
    useQuery({
        queryKey: ['support-ticket', id],
        queryFn: () => fetchJson(`/api/it/tickets/${id}`),
        enabled: !!id,
    });

export const useTicketComments = (id: string) =>
    useQuery({
        queryKey: ['support-ticket-comments', id],
        queryFn: () => fetchJson(`/api/it/tickets/${id}/comments`),
        enabled: !!id,
        select: (d: any) => (Array.isArray(d) ? d : []),
    });

export const useSupportDepartments = (enabled = true) =>
    useQuery({
        queryKey: ['support-departments'],
        queryFn: () => fetchJson('/api/support/departments'),
        enabled,
        staleTime: 5 * 60 * 1000,
        select: (d: any) => (Array.isArray(d) ? d : []) as Array<{ id: string; name: string }>,
    });

/** Assignable users for triagers (reuses the company-scoped KRA assignee list). */
export const useSupportAssignees = (enabled = true) =>
    useQuery({
        queryKey: ['support-assignees'],
        queryFn: () => fetchJson('/api/kra/assignees'),
        enabled,
        staleTime: 5 * 60 * 1000,
        select: (d: any) => (d?.assignees ?? []) as Array<{ userId: string; name: string; departmentName: string | null }>,
    });

export const useTicketMutations = (id?: string) => {
    const qc = useQueryClient();
    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ['support-tickets'] });
        if (id) {
            qc.invalidateQueries({ queryKey: ['support-ticket', id] });
            qc.invalidateQueries({ queryKey: ['support-ticket-comments', id] });
        }
    };

    const create = useMutation({
        mutationFn: (data: any) => fetchJson('/api/it/tickets', 'POST', data),
        onSuccess: invalidate,
    });

    const update = useMutation({
        mutationFn: (data: { id: string;[k: string]: any }) => fetchJson(`/api/it/tickets/${data.id}`, 'PATCH', data),
        onSuccess: invalidate,
    });

    const addComment = useMutation({
        mutationFn: (data: { id: string; body: string; isInternal?: boolean }) =>
            fetchJson(`/api/it/tickets/${data.id}/comments`, 'POST', { body: data.body, isInternal: data.isInternal }),
        onSuccess: invalidate,
    });

    return { create, update, addComment };
};

export const STATUS_STYLE: Record<string, string> = {
    OPEN: 'bg-secondary-100 text-secondary-600 border-secondary-200',
    IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
    ON_HOLD: 'bg-amber-50 text-amber-700 border-amber-200',
    RESOLVED: 'bg-success-50 text-success-700 border-success-200',
    CLOSED: 'bg-secondary-100 text-secondary-500 border-secondary-200',
};
export const PRIORITY_STYLE: Record<string, string> = {
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MEDIUM: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
    CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
};
