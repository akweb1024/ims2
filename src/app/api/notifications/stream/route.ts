import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const user = await getSessionUser();

    if (!user) {
        return new Response('Unauthorized', { status: 401 });
    }

    // Set up SSE headers
    const headers = new Headers({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    // Create a ReadableStream
    const readable = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            let isClosed = false;
            let intervalId: ReturnType<typeof setInterval> | undefined;

            const closeStream = () => {
                if (isClosed) return;
                isClosed = true;
                if (intervalId) {
                    clearInterval(intervalId);
                }
                try {
                    controller.close();
                } catch {
                    // Stream may already be closed by runtime/consumer.
                }
            };

            // Function to fetch and send unread notifications
            const sendNotifications = async () => {
                try {
                    if (isClosed) return;
                    const latestUnread = await prisma.notification.findMany({
                        where: { userId: user.id, isRead: false },
                        orderBy: { createdAt: 'desc' },
                        take: 5
                    });

                    // Only send data if we have notifications to avoid polling overhead
                    if (latestUnread.length > 0) {
                        const data = `data: ${JSON.stringify(latestUnread)}\n\n`;
                        if (isClosed) return;
                        controller.enqueue(encoder.encode(data));
                    }
                } catch (error) {
                    if ((error as { code?: string })?.code === 'ERR_INVALID_STATE' || isClosed) {
                        return;
                    }
                    console.error('SSE Notification Error:', error);
                }
            };

            // Send payload immediately on connect
            await sendNotifications();

            // Then send updates every 15 seconds
            intervalId = setInterval(async () => {
                await sendNotifications();
            }, 15000);

            // Cleanup when parsing fails or connection drops
            req.signal.addEventListener('abort', closeStream);
        }
    });

    return new Response(readable, { headers });
}
