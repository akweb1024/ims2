export enum SentinelEvent {
  TWIN_UPDATE = 'twin:update',
  NOTIFICATION = 'notification:new',
  AI_ADVICE = 'ai:advice',
  FINANCE_ALERT = 'finance:alert'
}

export interface SentinelNotification {
  userId?: string;
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
}

export interface SentinelAdvice {
  message: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  time: string;
}
