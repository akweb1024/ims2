import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { getEmployeeTwinStatus, getInventoryTwinStatus, computeTwinSummary } from '@/lib/digital-twin/twin-engine';

/**
 * GET /api/digital-twin/stream
 * 
 * Server-Sent Events (SSE) endpoint for real-time Digital Twin state.
 * Replaces the 10-second polling cycle on the client with a server-pushed stream.
 * The server sends a new data event every 5 seconds.
 * 
 * Connection lifecycle: client connects → server streams every 5s → client disconnects → stream closes.
 */
export async function GET(req: NextRequest) {
    // Authenticate the request using session cookies (EventSource sends cookies automatically)
    const session = await getServerSession(authOptions as any);
    const user = session?.user as any;

    if (!user?.id) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const companyId = user.companyId;
    if (!companyId) {
        return new Response(JSON.stringify({ error: 'No company associated' }), { status: 400 });
    }

    const encoder = new TextEncoder();
    let intervalId: NodeJS.Timeout | undefined;

    const stream = new ReadableStream({
        start(controller) {
            const sendSnapshot = async () => {
                try {
                    const [employees, inventory] = await Promise.all([
                        getEmployeeTwinStatus(companyId),
                        getInventoryTwinStatus(companyId),
                    ]);
                    const summary = computeTwinSummary(employees, inventory);
                    const payload = JSON.stringify({ employees, inventory, summary, timestamp: new Date().toISOString() });
                    controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                } catch (err) {
                    logger.error('SSE stream snapshot failed', err, { companyId });
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'sync_failed' })}\n\n`));
                }
            };

            // Send immediately on connect
            sendSnapshot();
            // Then every 5 seconds
            intervalId = setInterval(sendSnapshot, 5000);

            // Send a heartbeat ping every 25s to keep the connection alive through proxies
            const heartbeatId = setInterval(() => {
                controller.enqueue(encoder.encode(': ping\n\n'));
            }, 25000);

            req.signal.addEventListener('abort', () => {
                clearInterval(intervalId);
                clearInterval(heartbeatId);
                controller.close();
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
            'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
    });
}
