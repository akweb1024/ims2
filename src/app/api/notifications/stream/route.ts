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

            // Function to fetch and send unread notifications
            const sendNotifications = async () => {
                try {
                    const latestUnread = await prisma.notification.findMany({
                        where: { userId: user.id, isRead: false },
                        orderBy: { createdAt: 'desc' },
                        take: 5
                    });

                    // Only send data if we have notifications to avoid polling overhead
                    if (latestUnread.length > 0) {
                        const data = `data: ${JSON.stringify(latestUnread)}\n\n`;
                        controller.enqueue(encoder.encode(data));
                    }
                } catch (error) {
                    console.error('SSE Notification Error:', error);
                }
            };

            // Send payload immediately on connect
            await sendNotifications();

            // Then send updates every 15 seconds
            const intervalId = setInterval(async () => {
                await sendNotifications();
            }, 15000);

            // Cleanup when parsing fails or connection drops
            req.signal.addEventListener('abort', () => {
                clearInterval(intervalId);
                controller.close();
            });
        }
    });

    return new Response(readable, { headers });
}
