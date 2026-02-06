
export interface Goal {
    id: string;
    title: string;
    description: string | null;
    status: string;
    type: string;
    targetValue: number;
    currentValue: number;
    achievementPercentage: number;
    unit: string;
    startDate: string;
    endDate: string;
    employeeId: string;
    kra?: string;
    kpiId?: string;
    employee?: {
        id: string;
        user: {
            name: string;
            email: string;
        }
    };
    reviewer?: {
        id: string;
        name: string;
        email: string;
    };
}
