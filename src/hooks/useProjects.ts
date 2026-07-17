import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const fetchJson = async (url: string, method: string = 'GET', body?: any) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(url, {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `API Error: ${res.statusText}`);
    }
    return res.json();
};

/**
 * People who can be added to a project. Reuses the KRA assignee endpoint rather than a
 * new one — it already returns company-scoped { userId, name, departmentName }, and every
 * role allowed to create a project is inside its MANAGERIAL_ROLES gate.
 */
export const useProjectAssignees = (enabled: boolean) =>
    useQuery({
        queryKey: ['project-assignees'],
        queryFn: () => fetchJson('/api/kra/assignees'),
        enabled,
        staleTime: 5 * 60 * 1000,
        select: (data: any) => (data?.assignees ?? []) as Array<{ userId: string; name: string; departmentName: string | null }>,
    });

/** Review thread on a project, newest first, replies nested. */
export const useProjectComments = (projectId: string) =>
    useQuery({
        queryKey: ['project-comments', projectId],
        queryFn: () => fetchJson(`/api/projects/${projectId}/comments`),
        enabled: !!projectId,
    });

export const useProjectCommentMutations = (projectId: string) => {
    const qc = useQueryClient();
    const invalidate = () => qc.invalidateQueries({ queryKey: ['project-comments', projectId] });

    const addComment = useMutation({
        mutationFn: (data: { content: string; parentId?: string; visibility?: 'PUBLIC' | 'PRIVATE' }) =>
            fetchJson(`/api/projects/${projectId}/comments`, 'POST', data),
        onSuccess: invalidate,
    });

    const setCommentStatus = useMutation({
        mutationFn: (data: { commentId: string; status: 'OPEN' | 'RESOLVED'; resolutionNote?: string }) =>
            fetchJson(`/api/projects/${projectId}/comments`, 'PATCH', data),
        onSuccess: invalidate,
    });

    return { addComment, setCommentStatus };
};

export const useProjects = (filters?: any) => {
    const params = new URLSearchParams(filters).toString();
    return useQuery<any[]>({
        queryKey: ['projects', filters],
        queryFn: () => fetchJson(`/api/projects?${params}`),
    });
};

export const useProject = (id: string) => {
    return useQuery<any>({
        queryKey: ['project', id],
        queryFn: () => fetchJson(`/api/projects/${id}`),
        enabled: !!id
    });
};

export const useIssues = (filters?: any) => {
    const params = new URLSearchParams(filters).toString();
    return useQuery<any[]>({
        queryKey: ['issues', filters],
        queryFn: () => fetchJson(`/api/issues?${params}`),
    });
};

export const useProjectMutations = () => {
    const queryClient = useQueryClient();

    const createProject = useMutation({
        mutationFn: (data: any) => fetchJson('/api/projects', 'POST', data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
    });

    const updateProject = useMutation({
        mutationFn: (data: { id: string, [key: string]: any }) => fetchJson(`/api/projects/${data.id}`, 'PUT', data),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['project', vars.id] });
        }
    });

    const deleteProject = useMutation({
        mutationFn: (id: string) => fetchJson(`/api/projects/${id}`, 'DELETE'),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
    });

    return { createProject, updateProject, deleteProject };
};

export const useIssueMutations = () => {
    const queryClient = useQueryClient();

    const createIssue = useMutation({
        mutationFn: (data: any) => fetchJson('/api/issues', 'POST', data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['issues'] })
    });

    const addFollowUp = useMutation({
        mutationFn: (data: { issueId: string, content: string }) => fetchJson(`/api/issues/${data.issueId}/follow-ups`, 'POST', data),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['issues'] }); // Or specific issue query
            // You might want to invalidate specific issue
        }
    });

    return { createIssue, addFollowUp };
};
