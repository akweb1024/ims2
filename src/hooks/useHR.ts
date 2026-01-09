import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- Types ---
interface Employee {
    id: string;
    user?: {
        email: string;
        role: string;
        isActive: boolean;
    };
    [key: string]: any;
}

interface Holiday {
    id: string;
    name: string;
    date: string | Date;
    type: string;
    description?: string;
}

// --- API Helpers ---
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
        throw new Error(err.error || `API Error: ${res.statusText}`);
    }
    return res.json();
};

// --- Hooks ---

export const useEmployees = () => {
    return useQuery<Employee[]>({
        queryKey: ['employees'],
        queryFn: () => fetchJson('/api/hr/employees'),
        staleTime: 60 * 1000,
    });
};

export const useHolidays = (companyId?: string) => {
    return useQuery<Holiday[]>({
        queryKey: ['holidays', companyId],
        queryFn: () => fetchJson(`/api/hr/holidays${companyId ? `?companyId=${companyId}` : ''}`),
        staleTime: 5 * 60 * 1000,
    });
};

export const useDesignations = () => {
    return useQuery<any[]>({
        queryKey: ['designations'],
        queryFn: () => fetchJson('/api/hr/designations'),
        staleTime: 60 * 60 * 1000,
    });
};

export const useJobs = (showAll: boolean = false) => {
    return useQuery<any[]>({
        queryKey: ['jobs', { showAll }],
        queryFn: () => fetchJson(`/api/recruitment/jobs?all=${showAll}`),
    });
};

export const useApplications = () => {
    return useQuery<any[]>({
        queryKey: ['applications'],
        queryFn: () => fetchJson('/api/recruitment/applications'),
    });
};

export const useLeaveRequests = () => {
    return useQuery<any[]>({
        queryKey: ['leave-requests'],
        queryFn: () => fetchJson('/api/hr/leave-requests'),
    });
};

export const useSalarySlips = () => {
    return useQuery<any[]>({
        queryKey: ['salary-slips'],
        queryFn: () => fetchJson('/api/hr/salary-slips'),
    });
};

export const useAttendance = (all: boolean = true) => {
    return useQuery<any[]>({
        queryKey: ['attendance', { all }],
        queryFn: () => fetchJson(`/api/hr/attendance?all=${all}`),
    });
};

export const useWorkReports = (filters: any = {}) => {
    const params = new URLSearchParams(filters).toString();
    return useQuery<any[]>({
        queryKey: ['work-reports', filters],
        queryFn: () => fetchJson(`/api/hr/work-reports?${params}`),
    });
};

export const useTeam = () => {
    return useQuery<any[]>({
        queryKey: ['team'],
        queryFn: () => fetchJson('/api/team'),
    });
};

export const useProductivity = (startDate: string, endDate: string) => {
    return useQuery<any>({
        queryKey: ['productivity', { startDate, endDate }],
        queryFn: () => fetchJson(`/api/hr/productivity?startDate=${startDate}&endDate=${endDate}`),
    });
};

export const useDocuments = (employeeId?: string) => {
    return useQuery<any[]>({
        queryKey: ['documents', employeeId],
        queryFn: () => fetchJson(`/api/hr/documents${employeeId ? `?employeeId=${employeeId}` : ''}`),
        enabled: !!employeeId,
    });
};

export const usePerformanceReviews = () => {
    return useQuery<any[]>({
        queryKey: ['performance-reviews'],
        queryFn: () => fetchJson('/api/hr/performance'),
    });
};

export const useHRInsights = (enabled: boolean = true) => {
    return useQuery<any>({
        queryKey: ['hr-insights'],
        queryFn: () => fetchJson('/api/hr/analytics'),
        enabled,
    });
};

export const useOnboardingModules = () => {
    return useQuery<any[]>({
        queryKey: ['onboarding-modules'],
        queryFn: () => fetchJson('/api/hr/onboarding/modules'),
    });
};

export const useDepartments = () => {
    return useQuery<any[]>({
        queryKey: ['departments'],
        queryFn: () => fetchJson('/api/hr/departments'),
    });
};

// --- Mutations ---

export const useCreateEmployee = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => fetchJson('/api/hr/employees', 'POST', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
};

export const useUpdateEmployee = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => fetchJson('/api/hr/employees', 'PATCH', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
};

export const useLeaveRequestMutations = () => {
    const queryClient = useQueryClient();
    const updateStatus = useMutation({
        mutationFn: (data: { leaveId: string, status: string }) => fetchJson('/api/hr/leave-requests', 'PATCH', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
        },
    });
    return { updateStatus };
};

export const useDocumentMutations = () => {
    const queryClient = useQueryClient();
    const upload = useMutation({
        mutationFn: (data: any) => fetchJson('/api/hr/documents', 'POST', data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['documents', variables.employeeId] });
        },
    });

    const remove = useMutation({
        mutationFn: (id: string) => fetchJson(`/api/hr/documents?id=${id}`, 'DELETE'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        },
    });

    return { upload, remove };
};

export const useCreateJob = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => fetchJson('/api/recruitment/jobs', 'POST', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        }
    });
};

export const useUpdateJob = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => fetchJson('/api/recruitment/jobs', 'PATCH', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        }
    });
};

export const useHolidayMutations = () => {
    const queryClient = useQueryClient();

    const create = useMutation({
        mutationFn: (data: any) => fetchJson('/api/hr/holidays', 'POST', data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays'] }),
    });

    const update = useMutation({
        mutationFn: (data: any) => fetchJson('/api/hr/holidays', 'PUT', data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays'] }),
    });

    const remove = useMutation({
        mutationFn: (id: string) => fetchJson(`/api/hr/holidays?id=${id}`, 'DELETE'),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays'] }),
    });

    return { create, update, remove };
};

export const useLeaveLedger = (month: number, year: number) => {
    return useQuery<any[]>({
        queryKey: ['leave-ledger', { month, year }],
        queryFn: () => fetchJson(`/api/hr/leave-ledger?month=${month}&year=${year}`),
    });
};

export const useUpdateLeaveLedger = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => fetchJson('/api/hr/leave-ledger', 'POST', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-ledger'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
};

export const useLeaveMonitor = (month: number, year: number) => {
    return useQuery<any[]>({
        queryKey: ['leave-monitor', { month, year }],
        queryFn: () => fetchJson(`/api/hr/leave-monitoring?month=${month}&year=${year}`),
    });
};

export const useAdvances = (employeeId?: string) => {
    return useQuery<any[]>({
        queryKey: ['advances', employeeId],
        queryFn: () => fetchJson(`/api/hr/advances${employeeId ? `?employeeId=${employeeId}` : ''}`),
    });
};

export const useAdvanceMutations = () => {
    const queryClient = useQueryClient();
    const create = useMutation({
        mutationFn: (data: any) => fetchJson('/api/hr/advances', 'POST', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['advances'] });
        },
    });
    return { create };
};

export const useWorkReportMutations = () => {
    const queryClient = useQueryClient();

    const updateStatus = useMutation({
        mutationFn: (data: { id: string, status: string, managerComment?: string, managerRating?: number }) =>
            fetchJson('/api/hr/work-reports', 'PATCH', data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-reports'] }),
    });

    return { updateStatus };
};

export const usePerformanceReviewMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => fetchJson('/api/hr/performance', 'POST', data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['performance-reviews'] }),
    });
};

export const useAttendanceMutations = () => {
    const queryClient = useQueryClient();
    const correct = useMutation({
        mutationFn: (data: any) => fetchJson('/api/hr/attendance', 'PATCH', data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
    });
    return { correct };
};

export const useDeleteEmployee = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => fetchJson(`/api/hr/employees?id=${id}`, 'DELETE'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
};

export const useBulkSalaryMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => fetchJson('/api/hr/salary-slips', 'POST', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salary-slips'] });
        },
    });
};

export const useOnboardingMutations = () => {
    const queryClient = useQueryClient();
    const createModule = useMutation({
        mutationFn: (data: any) => fetchJson('/api/hr/onboarding/modules', 'POST', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['onboarding-modules'] });
        },
    });
    return { createModule };
};
