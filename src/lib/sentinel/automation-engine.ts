import { emitSentinelEvent } from './event-bus';
import { SentinelEvent } from './types';
import { prisma } from '../prisma';
import { logger } from '../logger';

export interface AutomationRule {
  id: string;
  trigger: string;
  condition: any;
  action: string;
}

/**
 * The Automation Engine evaluates rules against incoming system events.
 */
export class AutomationEngine {
  /**
   * Evaluates a specific trigger and runs matching rules.
   */
  static async evaluate(trigger: string, context: any) {
    logger.info(`[Sentinel] Evaluating Trigger: ${trigger}`, { context });

    // In a real app, we would fetch rules from the DB (AppConfiguration)
    // For this demonstration, we'll use a hardcoded rule set
    const activeRules: AutomationRule[] = [
      {
        id: 'rule-1',
        trigger: 'STOCK_LOW',
        condition: { threshold: 10 },
        action: 'NOTIFY_ADMIN'
      },
      {
        id: 'rule-2',
        trigger: 'FINANCE_LARGE',
        condition: { threshold: 1000000 },
        action: 'FLAG_FOR_REVIEW'
      }
    ];

    for (const rule of activeRules) {
      if (rule.trigger !== trigger) continue;

      const isMatch = this.checkCondition(rule.condition, context);
      if (isMatch) {
        await this.executeAction(rule.action, context);
      }
    }
  }

  private static checkCondition(condition: any, context: any): boolean {
    if (context.amount && condition.threshold) {
      return context.amount >= condition.threshold;
    }
    if (context.quantity && condition.threshold) {
      return context.quantity <= condition.threshold;
    }
    return false;
  }

  private static async executeAction(action: string, context: any) {
    logger.info(`[Sentinel] Executing Action: ${action}`, { context });

    switch (action) {
      case 'NOTIFY_ADMIN':
        emitSentinelEvent(SentinelEvent.NOTIFICATION, {
          title: '🛡️ Sentinel Automation: Stock Alert',
          message: `Automatic alert: ${context.itemName} has dropped below threshold.`,
          type: 'WARNING'
        });
        break;

      case 'FLAG_FOR_REVIEW':
        emitSentinelEvent(SentinelEvent.AI_ADVICE, {
          message: `Sentinel Agent: Anomalous transaction detected (${context.amount}). High-priority review task created.`,
          level: 'CRITICAL',
          time: new Date().toLocaleTimeString()
        });
        break;

      default:
        logger.warn(`Unknown automation action: ${action}`);
    }
  }
}
