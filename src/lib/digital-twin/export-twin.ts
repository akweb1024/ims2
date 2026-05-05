import { EmployeeTwin, InventoryTwin, TwinSummary } from '@/lib/digital-twin/twin-engine';

/**
 * Converts Digital Twin data into a downloadable CSV file.
 */
export function exportTwinToCSV(
    employees: EmployeeTwin[],
    inventory: InventoryTwin[],
    summary: TwinSummary,
    timestamp: string
) {
    const lines: string[] = [];

    // Header meta
    lines.push(`Digital Twin Export — ${new Date(timestamp).toLocaleString()}`);
    lines.push('');

    // Summary Section
    lines.push('SUMMARY');
    lines.push(`Active Employees,${summary.activeEmployees}`);
    lines.push(`Overloaded Staff,${summary.overloadedStaff}`);
    lines.push(`Critical Items,${summary.criticalItems}`);
    lines.push(`Warning Items,${summary.warningItems}`);
    lines.push(`Active Threads,${summary.activeThreads}`);
    lines.push(`Avg Engagement Score,${summary.avgEngagementScore}`);
    lines.push(`Avg KPI Progress,${summary.avgKpiProgress}`);
    lines.push(`High Risk Employees,${summary.highRiskEmployees}`);
    lines.push('');

    // Personnel Section
    lines.push('PERSONNEL NODES');
    lines.push('Name,Status,Active Tasks,Overdue Tasks,Bandwidth %,KPI Progress %,KRA Match %,Projects,Think Tank (30d),Reports (7d),Discipline,Linked Inventory IDs,Last Active,7-Day Attendance');
    employees.forEach(emp => {
        const thinkTankTotal = emp.thinkTankIdeas30d + emp.thinkTankVotes30d + emp.thinkTankQuestions30d + emp.thinkTankComments30d;
        lines.push([
            `"${emp.name}"`,
            emp.status,
            emp.taskCount,
            emp.overdueTasks,
            `${emp.bandwidth}%`,
            emp.avgKpiProgress.toFixed(2),
            (emp.avgKraMatch30d * 100).toFixed(1),
            emp.activeProjectsCount,
            thinkTankTotal,
            emp.workReports7d,
            emp.disciplineScore.toFixed(0),
            `"${emp.linkedInventoryIds.join(' | ')}"`,
            new Date(emp.lastActive).toLocaleString(),
            `"${emp.weeklyAttendance.join(', ')}"`,
        ].join(','));
    });
    lines.push('');

    // Asset Section
    lines.push('INVENTORY ASSET NODES');
    lines.push('Name,SKU,Status,Quantity,Min Level,Warehouse,Velocity');
    inventory.forEach(item => {
        lines.push([
            `"${item.name}"`,
            item.sku,
            item.status,
            item.quantity,
            item.minLevel,
            `"${item.warehouse}"`,
            item.velocity,
        ].join(','));
    });

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digital-twin-export-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
