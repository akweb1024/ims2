import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

async function checkSite(url: string, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const start = Date.now();

    try {
        const response = await fetch(url, { signal: controller.signal, method: 'HEAD' });
        if (response.status === 405) {
            clearTimeout(id);
            return checkSiteGet(url, timeout);
        }

        clearTimeout(id);
        const duration = Date.now() - start;
        return {
            up: response.ok,
            status: response.status,
            duration,
            reason: response.ok ? 'OK' : `HTTP ${response.status}`,
        };
    } catch (error: any) {
        clearTimeout(id);
        const duration = Date.now() - start;
        let reason = error.message;
        if (error.name === 'AbortError') reason = 'Connection Timeout';

        return {
            up: false,
            status: 0,
            duration,
            reason
        };
    }
}

async function checkSiteGet(url: string, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const start = Date.now();
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        const duration = Date.now() - start;
        return {
            up: response.ok,
            status: response.status,
            duration,
            reason: response.ok ? 'OK' : `HTTP ${response.status}`,
        };
    } catch (error: any) {
        clearTimeout(id);
        return { up: false, status: 0, duration: Date.now() - start, reason: error.message };
    }
}

export async function POST(req: NextRequest) {
    try {
        const monitors = await prisma.websiteMonitor.findMany({
            where: { isPaused: false }
        });

        const results = [];

        for (const monitor of monitors) {
            // Check Frequency logic
            if (monitor.lastCheck) {
                const nextCheck = new Date(monitor.lastCheck.getTime() + monitor.frequency * 60000);
                if (new Date() < nextCheck) {
                    continue;
                }
            }

            const result = await checkSite(monitor.url);

            // Log it
            await prisma.websiteMonitorLog.create({
                data: {
                    monitorId: monitor.id,
                    status: result.up ? 'UP' : 'DOWN',
                    statusCode: result.status,
                    responseTime: result.duration,
                    reason: result.reason
                }
            });

            // Alerts Logic
            const isDown = !result.up;
            const statusStr = isDown ? 'DOWN' : 'UP';
            const previousStatus = monitor.status;

            if (previousStatus !== statusStr && isDown) {
                if (monitor.notifyEmail) {
                    console.log(`[EMAIL ALERT] ${monitor.name} is DOWN. Reason: ${result.reason}`);
                    // Call email service here
                }
                if (monitor.notifyWhatsapp) {
                    console.log(`[WHATSAPP ALERT] ${monitor.name} is DOWN. Reason: ${result.reason}`);
                    // Call whatsapp service here
                }
            }

            let upsince = monitor.upsince;
            if (statusStr === 'UP' && previousStatus !== 'UP') {
                upsince = new Date();
            } else if (statusStr === 'DOWN') {
                upsince = null;
            }

            await prisma.websiteMonitor.update({
                where: { id: monitor.id },
                data: {
                    status: statusStr,
                    lastCheck: new Date(),
                    upsince
                }
            });

            results.push({ id: monitor.id, name: monitor.name, result });
        }

        return NextResponse.json({ checked: results.length, results });
    } catch (error) {
        return createErrorResponse(error);
    }
}
