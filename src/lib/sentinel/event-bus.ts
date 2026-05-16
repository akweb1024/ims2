import { EventEmitter } from 'events';
import { SentinelEvent } from './types';
import { AutomationEngine } from './automation-engine';

export { SentinelEvent } from './types';

const globalForSentinel = global as unknown as { sentinelBus: EventEmitter };

export const sentinelBus = globalForSentinel.sentinelBus || new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForSentinel.sentinelBus = sentinelBus;
}

sentinelBus.setMaxListeners(200);

export function emitSentinelEvent(event: SentinelEvent, data: any) {
  sentinelBus.emit(event, data);

  // Evaluate for automation rules
  if (event === SentinelEvent.FINANCE_ALERT || event === SentinelEvent.TWIN_UPDATE) {
    AutomationEngine.evaluate(event, data).catch(err => {
      console.error('[Sentinel] Automation evaluation failed:', err);
    });
  }
}
