import { prisma } from '@/lib/prisma';

type UserFkRef = {
    schema_name: string;
    table_name: string;
    column_name: string;
    delete_rule: string;
    is_nullable: 'YES' | 'NO';
};

export type UserDeletionDependency = {
    table: string;
    column: string;
    deleteRule: string;
    nullable: boolean;
    count: number;
    action: 'cascade' | 'setNull' | 'delete' | 'nullify';
    samples: UserDeletionSample[];
};

export type UserDeletionSample = {
    id: string | null;
    label: string;
    details?: string;
};

function quoteIdent(identifier: string) {
    return `"${identifier.replace(/"/g, '""')}"`;
}

function qualifyTable(schemaName: string, tableName: string) {
    return `${quoteIdent(schemaName)}.${quoteIdent(tableName)}`;
}

function buildSampleLabel(row: Record<string, any>, tableName: string): UserDeletionSample {
    const preferredLabelKeys = [
        'name',
        'title',
        'subject',
        'code',
        'email',
        'organizationName',
        'organization_name',
        'invoiceNumber',
        'proformaNumber',
        'referenceNumber',
        'number',
        'role',
        'action',
        'entity',
        'status',
    ];

    const preferredDetailKeys = [
        'status',
        'type',
        'category',
        'role',
        'entity',
        'action',
        'description',
    ];

    const id = row.id ?? row._id ?? row.uuid ?? null;
    let labelValue = preferredLabelKeys.map((key) => row[key]).find((value) => typeof value === 'string' && value.trim().length > 0);

    if (!labelValue) {
        labelValue = row.name || row.title || row.subject || row.code || row.email || `${tableName} record`;
    }

    const detailValue = preferredDetailKeys
        .map((key) => row[key])
        .find((value) => typeof value === 'string' && value.trim().length > 0);

    return {
        id,
        label: String(labelValue),
        details: detailValue ? String(detailValue) : undefined
    };
}

async function getUserForeignKeyRefs(tx: any) {
    const refs = await tx.$queryRaw`
        SELECT
            n.nspname AS schema_name,
            c.relname AS table_name,
            a.attname AS column_name,
            c.confdeltype AS delete_rule,
            CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable
        FROM pg_constraint c
        JOIN pg_class cls ON cls.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = cls.relnamespace
        JOIN LATERAL unnest(c.conkey) AS key_cols(attnum) ON true
        JOIN pg_attribute a
            ON a.attrelid = c.conrelid
           AND a.attnum = key_cols.attnum
        WHERE c.contype = 'f'
          AND c.confrelid = '"User"'::regclass
          AND array_length(c.conkey, 1) = 1
        ORDER BY c.conrelid::regclass::text, a.attname;
    `;

    return refs;
}

export async function getUserDeletionPreview(userId: string) {
    const refs = await getUserForeignKeyRefs(prisma) as UserFkRef[];

    const dependencies: UserDeletionDependency[] = [];

    for (const ref of refs) {
        const countRows = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*)::bigint AS count FROM ${qualifyTable(ref.schema_name, ref.table_name)} WHERE ${quoteIdent(ref.column_name)} = $1`,
            userId
        ) as Array<{ count: bigint }>;

        const count = Number(countRows?.[0]?.count || 0);
        if (!count) continue;

        const sampleRows = await prisma.$queryRawUnsafe(
            `SELECT * FROM ${qualifyTable(ref.schema_name, ref.table_name)} WHERE ${quoteIdent(ref.column_name)} = $1 LIMIT 12`,
            userId
        ) as Array<Record<string, any>>;

        const deleteRule = ref.delete_rule;
        const nullable = ref.is_nullable === 'YES';
        const action: UserDeletionDependency['action'] =
            deleteRule === 'c' ? 'cascade' :
                deleteRule === 'n' ? 'setNull' :
                    nullable ? 'nullify' : 'delete';

        dependencies.push({
            table: ref.table_name,
            column: ref.column_name,
            deleteRule,
            nullable,
            count,
            action,
            samples: sampleRows.map((row) => buildSampleLabel(row, ref.table_name))
        });
    }

    const directUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            companyId: true,
            employeeProfile: {
                select: {
                    id: true,
                    employeeId: true,
                    designation: true
                }
            },
            customerProfile: {
                select: {
                    id: true,
                    organizationName: true,
                    name: true
                }
            }
        }
    });

    return {
        user: directUser,
        dependencies,
        totalDependencies: dependencies.reduce((sum, dep) => sum + dep.count, 0)
    };
}

export async function hardDeleteUser(userId: string) {
    const result = await prisma.$transaction(async (tx: any) => {
        const refs = await getUserForeignKeyRefs(tx);

        const actions: Array<{ table: string; column: string; action: string; count: number }> = [];

        for (const ref of refs) {
            const countRows = await tx.$queryRawUnsafe(
                `SELECT COUNT(*)::bigint AS count FROM ${qualifyTable(ref.schema_name, ref.table_name)} WHERE ${quoteIdent(ref.column_name)} = $1`,
                userId
            ) as Array<{ count: bigint }>;
            const count = Number(countRows?.[0]?.count || 0);
            if (!count) continue;

            const deleteRule = ref.delete_rule;
            const nullable = ref.is_nullable === 'YES';

            if (deleteRule === 'c' || deleteRule === 'n') {
                actions.push({
                    table: ref.table_name,
                    column: ref.column_name,
                    action: deleteRule === 'c' ? 'cascade' : 'setNull',
                    count
                });
                continue;
            }

            if (nullable) {
                await tx.$executeRawUnsafe(
                    `UPDATE ${qualifyTable(ref.schema_name, ref.table_name)} SET ${quoteIdent(ref.column_name)} = NULL WHERE ${quoteIdent(ref.column_name)} = $1`,
                    userId
                );
                actions.push({
                    table: ref.table_name,
                    column: ref.column_name,
                    action: 'nullify',
                    count
                });
                continue;
            }

            await tx.$executeRawUnsafe(
                `DELETE FROM ${qualifyTable(ref.schema_name, ref.table_name)} WHERE ${quoteIdent(ref.column_name)} = $1`,
                userId
            );
            actions.push({
                table: ref.table_name,
                column: ref.column_name,
                action: 'delete',
                count
            });
        }

        const deletedUser = await tx.user.delete({
            where: { id: userId }
        });

        return { deletedUser, actions };
    });

    return result;
}
