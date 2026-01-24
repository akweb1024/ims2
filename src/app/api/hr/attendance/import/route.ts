import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const formData = await req.formData();
            const file = formData.get('file') as File;

            if (!file) {
                return createErrorResponse('No file uploaded', 400);
            }

            const text = await file.text();
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

            // expected headers: employee id/email, date, check in, check out, status
            const emailIdx = headers.findIndex(h => h.includes('email'));
            const dateIdx = headers.findIndex(h => h.includes('date'));
            const inIdx = headers.findIndex(h => h.includes('check in'));
            const outIdx = headers.findIndex(h => h.includes('check out'));
            const statusIdx = headers.findIndex(h => h.includes('status'));

            if (emailIdx === -1 || dateIdx === -1) {
                return createErrorResponse('CSV must contain Email and Date columns', 400);
            }

            const results = {
                success: 0,
                failed: 0,
                errors: [] as string[]
            };

            // Process rows
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const cols = line.split(',').map(c => c.replace(/"/g, '').trim()); // Simple CSV parse
                const email = cols[emailIdx];
                const dateStr = cols[dateIdx];

                if (!email || !dateStr) continue;

                try {
                    // Find employee
                    const employee = await prisma.employeeProfile.findFirst({
                        where: { user: { email: { equals: email, mode: 'insensitive' } } }
                    });

                    if (!employee) {
                        results.failed++;
                        results.errors.push(`Row ${i + 1}: Employee not found (${email})`);
                        continue;
                    }

                    const date = new Date(dateStr);
                    if (isNaN(date.getTime())) {
                        results.failed++;
                        results.errors.push(`Row ${i + 1}: Invalid date (${dateStr})`);
                        continue;
                    }

                    // Parse times if present
                    let checkIn = null;
                    let checkOut = null;

                    if (inIdx !== -1 && cols[inIdx] && cols[inIdx] !== '-') {
                        // Assuming format is HH:MM:SS or part of date
                        // If only time provided, merge with date
                        const timeStr = cols[inIdx];
                        if (timeStr.includes(':')) {
                            const [h, m] = timeStr.split(':');
                            checkIn = new Date(date);
                            checkIn.setHours(parseInt(h), parseInt(m), 0);
                        } else {
                            checkIn = new Date(timeStr); // Full ISO?
                        }
                    }

                    if (outIdx !== -1 && cols[outIdx] && cols[outIdx] !== '-') {
                        const timeStr = cols[outIdx];
                        if (timeStr.includes(':')) {
                            const [h, m] = timeStr.split(':');
                            checkOut = new Date(date);
                            checkOut.setHours(parseInt(h), parseInt(m), 0);
                        } else {
                            checkOut = new Date(timeStr);
                        }
                    }

                    const status = statusIdx !== -1 ? cols[statusIdx] : 'PRESENT';

                    await prisma.attendance.upsert({
                        where: {
                            employeeId_date: {
                                employeeId: employee.id,
                                date: date
                            }
                        },
                        update: {
                            checkIn: checkIn || undefined,
                            checkOut: checkOut || undefined,
                            status: status || 'PRESENT'
                        },
                        create: {
                            employeeId: employee.id,
                            date: date,
                            checkIn: checkIn,
                            checkOut: checkOut,
                            status: status || 'PRESENT',
                            companyId: user.companyId
                        }
                    });

                    results.success++;

                } catch (e: any) {
                    results.failed++;
                    results.errors.push(`Row ${i + 1}: ${e.message}`);
                }
            }

            return NextResponse.json(results);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
