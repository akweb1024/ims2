import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { sentinelBus } from '@/lib/sentinel/event-bus';
import { SentinelEvent } from '@/lib/sentinel/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const readable = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (event: string, data: any) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // Listen for events from the bus
      const onTwinUpdate = (data: any) => send(SentinelEvent.TWIN_UPDATE, data);
      const onNotification = (data: any) => {
        if (data.userId === user.id || !data.userId) {
          send(SentinelEvent.NOTIFICATION, data);
        }
      };
      const onAiAdvice = (data: any) => send(SentinelEvent.AI_ADVICE, data);

      sentinelBus.on(SentinelEvent.TWIN_UPDATE, onTwinUpdate);
      sentinelBus.on(SentinelEvent.NOTIFICATION, onNotification);
      sentinelBus.on(SentinelEvent.AI_ADVICE, onAiAdvice);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 30000);

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        sentinelBus.off(SentinelEvent.TWIN_UPDATE, onTwinUpdate);
        sentinelBus.off(SentinelEvent.NOTIFICATION, onNotification);
        sentinelBus.off(SentinelEvent.AI_ADVICE, onAiAdvice);
        controller.close();
      });
    }
  });

  return new Response(readable, { headers });
}
