import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { getEmployeeTwinStatus, getInventoryTwinStatus, computeTwinSummary } from '@/lib/digital-twin/twin-engine';

/**
 * GET /api/digital-twin/stream
 *
 * Server-Sent Events (SSE) endpoint for real-time Digital Twin state.
 * Replaces the 10-second client-side polling with a server-pushed stream.
 * The server sends a new data event every 5 seconds.
 *
 * Connection lifecycle: client connects → server streams every 5s → client disconnects → stream closes.
 */
export async function GET(req: NextRequest) {
    // Authenticate using the project's standard session utility (same as authorizedRoute)
    const user = await getAuthenticatedUser();

    if (!user?.id) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const companyId = user.companyId;
    if (!companyId) {
        return new Response(JSON.stringify({ error: 'No company associated' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            let intervalId: ReturnType<typeof setInterval>;
            let heartbeatId: ReturnType<typeof setInterval>;

            const sendSnapshot = async () => {
                try {
                    const [employees, inventory] = await Promise.all([
                        getEmployeeTwinStatus(companyId),
                        getInventoryTwinStatus(companyId),
                    ]);
                    const summary = computeTwinSummary(employees, inventory);
                    const payload = JSON.stringify({
                        employees,
                        inventory,
                        summary,
                        timestamp: new Date().toISOString(),
                    });
                    controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                } catch (err) {
                    logger.error('SSE stream snapshot failed', err, { companyId });
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: 'sync_failed' })}\n\n`)
                    );
                }
            };

            // Send immediately on connect, then every 5 seconds
            sendSnapshot();
            intervalId = setInterval(sendSnapshot, 5000);

            // Heartbeat ping every 25s to keep connection alive through proxies
            heartbeatId = setInterval(() => {
                controller.enqueue(encoder.encode(': ping\n\n'));
            }, 25000);

            req.signal.addEventListener('abort', () => {
                clearInterval(intervalId);
                clearInterval(heartbeatId);
                try { controller.close(); } catch {}
                logger.debug('SSE stream closed by client', { companyId });
            });
        },
    });

    logger.debug('SSE stream opened', { companyId, userId: user.id });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx/proxy buffering
        },
    });
}
