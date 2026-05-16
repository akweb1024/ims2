import { emitSentinelEvent } from '../event-bus';
import { SentinelEvent } from '../types';
import { getEmployeeTwinStatus, getInventoryTwinStatus } from '../../digital-twin/twin-engine';
import { runIntelligenceEngine } from '../../digital-twin/intelligence';
import { predictInventoryDepletion, predictCashRunway } from '../forecasting';
import { logger } from '../../logger';

/**
 * RiskSentinel: Monitors system health and employee overload.
 */
async function runRiskSentinel(companyId: string) {
  try {
    const [employees, inventory] = await Promise.all([
      getEmployeeTwinStatus(companyId),
      getInventoryTwinStatus(companyId)
    ]);

    const intel = runIntelligenceEngine(employees, inventory);

    if (intel.healthScore < 75) {
      emitSentinelEvent(SentinelEvent.AI_ADVICE, {
        message: `System health has dropped to ${intel.healthScore}%. Critical risks detected in ${intel.overloadPredictions.length} employee nodes.`,
        level: 'WARNING',
        time: new Date().toLocaleTimeString()
      });
    }

    // 3. Proactive advice for critical inventory
    const criticalItems = intel.depletionForecasts.filter(f => f.risk === 'HIGH');
    if (criticalItems.length > 0) {
      emitSentinelEvent(SentinelEvent.AI_ADVICE, {
        message: `Inventory Alert: ${criticalItems[0].itemName} is depleting rapidly. Estimated depletion in ${criticalItems[0].estimatedDaysLeft} days.`,
        level: 'CRITICAL',
        time: new Date().toLocaleTimeString()
      });
    }

    // 4. Sentinel Forecasting (New Phase 3 logic)
    const [invForecasts, cashForecast] = await Promise.all([
      predictInventoryDepletion(companyId),
      predictCashRunway(companyId)
    ]);

    if (cashForecast.riskLevel === 'CRITICAL') {
      emitSentinelEvent(SentinelEvent.AI_ADVICE, {
        message: `Financial Prediction: Critical runway detected. Cash will deplete in ${cashForecast.monthsLeft} months at current burn rate.`,
        level: 'CRITICAL',
        time: new Date().toLocaleTimeString()
      });
    }

    const highRiskInv = invForecasts.find(f => f.riskLevel === 'HIGH');
    if (highRiskInv) {
      emitSentinelEvent(SentinelEvent.AI_ADVICE, {
        message: `Predictive Restock: ${highRiskInv.itemName} will hit zero in ~${highRiskInv.daysToZero} days. Confidence: ${highRiskInv.confidence}%.`,
        level: 'WARNING',
        time: new Date().toLocaleTimeString()
      });
    }

  } catch (err) {
    logger.error('RiskSentinel Failed', err);
  }
}

/**
 * FinanceSentinel: Analyzes journal entries for anomalies.
 */
export async function runFinanceSentinel(journalEntry: any) {
  // Mock anomaly detection: flag entries > 1,000,000 INR
  if (journalEntry.amount > 1000000) {
    emitSentinelEvent(SentinelEvent.AI_ADVICE, {
      message: `High-value Journal Entry detected: ${journalEntry.amount} ${journalEntry.currency}. Flagging for senior review.`,
      level: 'INFO',
      time: new Date().toLocaleTimeString()
    });
  }
}

/**
 * Global Sentinel Audit
 */
export async function triggerSentinelAudit(companyId: string) {
  logger.info('Sentinel Audit Triggered', { companyId });
  await runRiskSentinel(companyId);
}
