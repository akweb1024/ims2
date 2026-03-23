import prisma from '@/lib/prisma';

let employeeTaskTemplateColumnsPromise: Promise<Set<string>> | null = null;

export async function getEmployeeTaskTemplateColumns(): Promise<Set<string>> {
    if (!employeeTaskTemplateColumnsPromise) {
        employeeTaskTemplateColumnsPromise = prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
            `SELECT column_name
             FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'EmployeeTaskTemplate'
             ORDER BY ordinal_position`
        ).then((rows) => new Set(rows.map((row) => row.column_name)));
    }

    return employeeTaskTemplateColumnsPromise;
}

export function hasTaskTemplateColumn(columns: Set<string>, column: string): boolean {
    return columns.has(column);
}
