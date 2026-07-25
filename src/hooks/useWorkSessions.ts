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
        e.body = err;
        throw e;
    }
    return res.json();
};

export type ProjectRef = { projectId?: string; itProjectId?: string };

/** The caller's currently running session (polls so the timer/other tabs stay in sync). */
export const useCurrentSession = () =>
    useQuery({
        queryKey: ['work-session-current'],
        queryFn: () => fetchJson('/api/work-sessions/current'),
        refetchInterval: 60_000,
        select: (d: any) => d?.session ?? null,
    });

/** All sessions on one project (team view for the project detail page). */
export const useProjectSessions = (ref: ProjectRef, enabled = true) =>
    useQuery({
        queryKey: ['work-sessions', ref],
        queryFn: () => {
            const p = new URLSearchParams(ref as Record<string, string>).toString();
            return fetchJson(`/api/work-sessions?${p}`);
        },
        enabled: enabled && (!!ref.projectId || !!ref.itProjectId),
        select: (d: any) => (Array.isArray(d) ? d : []),
    });

/** The caller's own recent sessions (My Work page). */
export const useMySessions = () =>
    useQuery({
        queryKey: ['work-sessions', 'mine'],
        queryFn: () => fetchJson('/api/work-sessions?mine=true'),
        select: (d: any) => (Array.isArray(d) ? d : []),
    });

/** Completed-session time totals over a window (managers/admins). */
export const useTimeAnalytics = (days = 7, enabled = true) =>
    useQuery({
        queryKey: ['work-sessions-analytics', days],
        queryFn: () => fetchJson(`/api/work-sessions/analytics?days=${days}`),
        enabled,
    });

/** Live "who is working now" feed for managers/admins. */
export const useLiveSessions = (enabled = true) =>
    useQuery({
        queryKey: ['work-sessions-live'],
        queryFn: () => fetchJson('/api/work-sessions/live'),
        enabled,
        refetchInterval: 30_000,
    });

export const useWorkSessionMutations = () => {
    const qc = useQueryClient();
    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ['work-session-current'] });
        qc.invalidateQueries({ queryKey: ['work-sessions'] });
        qc.invalidateQueries({ queryKey: ['work-sessions-live'] });
    };

    const start = useMutation({
        mutationFn: (ref: ProjectRef & { note?: string }) => fetchJson('/api/work-sessions', 'POST', ref),
        onSuccess: invalidate,
    });

    const stop = useMutation({
        mutationFn: (data: { id: string; note?: string }) =>
            fetchJson(`/api/work-sessions/${data.id}/stop`, 'POST', { note: data.note }),
        onSuccess: invalidate,
    });

    const addActivity = useMutation({
        mutationFn: (data: { id: string; description: string }) =>
            fetchJson(`/api/work-sessions/${data.id}/activity`, 'POST', { description: data.description }),
        onSuccess: invalidate,
    });

    return { start, stop, addActivity };
};

/** "2h 15m" from whole minutes. */
export const formatMinutes = (m: number) => {
    if (!m || m < 1) return '0m';
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h ? `${h}h ${min}m` : `${min}m`;
};
