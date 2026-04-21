import { EmployeeTwin, InventoryTwin } from './twin-engine';

// ─── Prediction Types ────────────────────────────────────────────────────────

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface OverloadPrediction {
    employeeId: string;
    employeeName: string;
    currentBandwidth: number;
    taskCount: number;
    risk: RiskLevel;
    reason: string;
}

export interface DepletionForecast {
    inventoryId: string;
    itemName: string;
    sku: string;
    currentQuantity: number;
    minLevel: number;
    velocity: number;
    estimatedDaysLeft: number;
    risk: RiskLevel;
}

export interface DispatchSuggestion {
    inventoryId: string;
    itemName: string;
    sku: string;
    itemStatus: string;
    urgency: RiskLevel;
    recommendedEmployees: Array<{
        employeeId: string;
        userId: string;
        name: string;
        bandwidth: number;
        taskCount: number;
        reason: string;
    }>;
}

export interface IntelligenceSummary {
    overloadPredictions: OverloadPrediction[];
    depletionForecasts: DepletionForecast[];
    dispatchSuggestions: DispatchSuggestion[];
    healthScore: number; // 0-100 overall system health
}

// ─── Intelligence Engine ─────────────────────────────────────────────────────

/**
 * Predicts which employees are approaching or at overload capacity
 * based on current bandwidth and task velocity.
 */
export function predictOverload(employees: EmployeeTwin[]): OverloadPrediction[] {
    return employees
        .map(emp => {
            let risk: RiskLevel | null = null;
            let reason = '';

            if (emp.status === 'ON_LEAVE') return null;

            // Highly engaged employees (score > 70) have slightly higher tolerance before burnout
            const isHighlyEngaged = (emp.engagementScore || 0) > 70;
            const highThreshold = isHighlyEngaged ? 20 : 30;
            const medThreshold = isHighlyEngaged ? 45 : 55;

            if (emp.status === 'OVERLOADED') {
                risk = 'HIGH';
                reason = `Currently overloaded with ${emp.taskCount} active tasks and ${emp.bandwidth}% bandwidth remaining.`;
            } else if (emp.status === 'OFFLINE_ALERT') {
                risk = 'HIGH';
                reason = `Offline with ${emp.taskCount} unresolved tasks. Urgent reassignment recommended.`;
            } else if (emp.bandwidth < highThreshold && emp.status === 'ACTIVE') {
                risk = 'HIGH';
                reason = `Only ${emp.bandwidth}% bandwidth remaining. One more task will trigger overload.`;
            } else if (emp.bandwidth < medThreshold && emp.status === 'ACTIVE') {
                risk = 'MEDIUM';
                reason = `Bandwidth at ${emp.bandwidth}%. Approaching capacity threshold.`;
            }

            if (!risk) return null;

            return {
                employeeId: emp.id,
                employeeName: emp.name,
                currentBandwidth: emp.bandwidth,
                taskCount: emp.taskCount,
                risk,
                reason,
            };
        })
        .filter(Boolean) as OverloadPrediction[];
}

/**
 * Forecasts stock depletion timelines based on recent movement velocity.
 * Uses a linear depletion model: estimatedDays = quantity / dailyRate.
 */
export function forecastDepletion(inventory: InventoryTwin[]): DepletionForecast[] {
    return inventory
        .map(item => {
            // velocity = number of recent movements (proxy for daily demand)
            // We treat 10 recent movements as roughly 10 daily units of demand
            const dailyRate = item.velocity > 0 ? item.velocity / 5 : 0.5;
            const estimatedDaysLeft = Math.floor(item.quantity / dailyRate);

            let risk: RiskLevel | null = null;

            if (item.status === 'CRITICAL') {
                risk = 'HIGH';
            } else if (estimatedDaysLeft <= 7) {
                risk = 'HIGH';
            } else if (estimatedDaysLeft <= 30 || item.status === 'WARNING') {
                risk = 'MEDIUM';
            }

            if (!risk) return null;

            return {
                inventoryId: item.id,
                itemName: item.name,
                sku: item.sku,
                currentQuantity: item.quantity,
                minLevel: item.minLevel,
                velocity: item.velocity,
                estimatedDaysLeft,
                risk,
            };
        })
        .filter(Boolean) as DepletionForecast[];
}

/**
 * Generates smart dispatch suggestions: for each at-risk asset,
 * finds the most suitable available employee to handle restocking.
 */
export function generateDispatchSuggestions(
    employees: EmployeeTwin[],
    inventory: InventoryTwin[]
): DispatchSuggestion[] {
    const availableEmployees = employees
        .filter(e => e.status === 'ACTIVE' && e.bandwidth > 15)
        .sort((a, b) => b.bandwidth - a.bandwidth); // highest bandwidth first

    const urgentItems = inventory.filter(i => i.status === 'CRITICAL' || i.status === 'WARNING');

    return urgentItems.map(item => {
        const urgency: RiskLevel = item.status === 'CRITICAL' ? 'HIGH' : 'MEDIUM';

        // Prefer employees not already linked to this item
        const ranked = availableEmployees
            .filter(e => !e.linkedInventoryIds.includes(item.id))
            .slice(0, 3)
            .map(emp => ({
                employeeId: emp.id,
                userId: emp.userId,
                name: emp.name,
                bandwidth: emp.bandwidth,
                taskCount: emp.taskCount,
                reason: emp.taskCount === 0
                    ? 'Fully available — no active tasks.'
                    : `${emp.bandwidth}% bandwidth free across ${emp.taskCount} task${emp.taskCount !== 1 ? 's' : ''}.`,
            }));

        return {
            inventoryId: item.id,
            itemName: item.name,
            sku: item.sku,
            itemStatus: item.status,
            urgency,
            recommendedEmployees: ranked,
        };
    });
}

/**
 * Computes an overall system health score from 0 (worst) to 100 (best).
 */
export function computeHealthScore(
    employees: EmployeeTwin[],
    inventory: InventoryTwin[]
): number {
    if (employees.length === 0 && inventory.length === 0) return 100;

    const totalNodes = employees.length + inventory.length;
    let penalty = 0;

    employees.forEach(e => {
        if (e.status === 'ON_LEAVE') penalty += 0; // Neutral impact
        else if (e.status === 'OVERLOADED') penalty += 20;
        else if (e.status === 'OFFLINE_ALERT') penalty += 15;
        else if (e.bandwidth < 30) penalty += 8;
        
        // Bonus for high organizational engagement across active roster
        if (e.status !== 'ON_LEAVE' && (e.engagementScore || 0) > 80) penalty -= 2;
    });

    inventory.forEach(i => {
        if (i.status === 'CRITICAL') penalty += 25;
        else if (i.status === 'WARNING') penalty += 10;
    });

    const maxPenalty = totalNodes * 25;
    return Math.max(0, Math.round(100 - (penalty / maxPenalty) * 100));
}

/** Master function: runs all intelligence analyses and returns a unified report. */
export function runIntelligenceEngine(
    employees: EmployeeTwin[],
    inventory: InventoryTwin[]
): IntelligenceSummary {
    return {
        overloadPredictions: predictOverload(employees),
        depletionForecasts: forecastDepletion(inventory),
        dispatchSuggestions: generateDispatchSuggestions(employees, inventory),
        healthScore: computeHealthScore(employees, inventory),
    };
}
