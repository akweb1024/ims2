import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { parse } from 'csv-parse/sync';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const monitors = await prisma.websiteMonitor.findMany({
                where: user.companyId ? { companyId: user.companyId } : {},
                select: {
                    name: true,
                    url: true,
                    frequency: true,
                    notifyEmail: true,
                    notifyWhatsapp: true
                }
            });

            // Manual CSV generation
            const header = ['name', 'url', 'frequency', 'notifyEmail', 'notifyWhatsapp'];
            const rows = monitors.map(m => [
                `"${m.name.replace(/"/g, '""')}"`,
                `"${m.url.replace(/"/g, '""')}"`,
                m.frequency,
                m.notifyEmail,
                m.notifyWhatsapp
            ]);

            const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');

            return new NextResponse(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="monitor_export_${new Date().toISOString().split('T')[0]}.csv"`
                }
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            // we assume the body is the CSV text provided as a file or raw text
            // In a real file upload, we usually get FormData. 
            // Let's support JSON { csvContent: string } or raw text for simplicity if handled by frontend

            const formData = await req.formData();
            const file = formData.get('file') as File;

            if (!file) {
                return createErrorResponse('No file uploaded', 400);
            }

            const text = await file.text();

            const records = parse(text, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            const created = [];
            const errors = [];

            for (const record of records) {
                // Validation
                if (!record.name || !record.url) {
                    errors.push({ record, error: 'Missing name or url' });
                    continue;
                }

                try {
                    const monitor = await prisma.websiteMonitor.create({
                        data: {
                            name: record.name,
                            url: record.url,
                            frequency: parseInt(record.frequency) || 5,
                            notifyEmail: record.notifyEmail === 'true' || record.notifyEmail === true,
                            notifyWhatsapp: record.notifyWhatsapp === 'true' || record.notifyWhatsapp === true,
                            companyId: user.companyId,
                            status: 'PENDING'
                        }
                    });
                    created.push(monitor);
                } catch (err: any) {
                    errors.push({ record, error: err.message });
                }
            }

            return NextResponse.json({
                success: true,
                count: created.length,
                errors: errors.length > 0 ? errors : undefined
            });

        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
