import { NextRequest, NextResponse } from 'next/server';

// Mock work reports - replace with actual database queries
const mockWorkReports = [
    {
        id: '1',
        employeeId: '1',
        employeeName: 'John Doe',
        employeeEmail: 'john@company.com',
        department: 'Engineering',
        date: new Date().toISOString().split('T')[0],
        tasks: [
            { id: '1', description: 'Completed module X implementation', hours: 4, status: 'COMPLETED' },
            { id: '2', description: 'Code review for team member', hours: 2, status: 'COMPLETED' },
            { id: '3', description: 'Attended team meeting', hours: 1, status: 'COMPLETED' }
        ],
        totalHours: 7,
        status: 'PENDING',
        managerComment: null,
        submittedAt: new Date().toISOString()
    },
    {
        id: '2',
        employeeId: '2',
        employeeName: 'Jane Smith',
        employeeEmail: 'jane@company.com',
        department: 'Marketing',
        date: new Date().toISOString().split('T')[0],
        tasks: [
            { id: '4', description: 'Created social media content', hours: 3, status: 'COMPLETED' },
            { id: '5', description: 'Email campaign setup', hours: 2, status: 'COMPLETED' },
            { id: '6', description: 'Analytics report', hours: 2, status: 'COMPLETED' }
        ],
        totalHours: 7,
        status: 'APPROVED',
        managerComment: 'Great work!',
        submittedAt: new Date().toISOString()
    }
];

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const companyId = searchParams.get('companyId');
        const departmentId = searchParams.get('departmentId');
        const employeeId = searchParams.get('employeeId');

        // Return mock data - in production, query from database
        let reports = mockWorkReports;

        if (date) {
            reports = reports.filter(r => r.date === date);
        }

        return NextResponse.json(reports);
    } catch (error) {
        console.error('Error fetching work reports:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
