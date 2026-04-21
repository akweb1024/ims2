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
    lines.push('');

    // Personnel Section
    lines.push('PERSONNEL NODES');
    lines.push('Name,Status,Active Tasks,Bandwidth %,Linked Inventory IDs,Last Active,7-Day Attendance');
    employees.forEach(emp => {
        lines.push([
            `"${emp.name}"`,
            emp.status,
            emp.taskCount,
            `${emp.bandwidth}%`,
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
