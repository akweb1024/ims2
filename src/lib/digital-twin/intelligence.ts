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

export interface EmployeePerformanceRisk {
    employeeId: string;
    employeeName: string;
    risk: RiskLevel;
    score: number;
    reasons: string[];
}

export interface ClarifyingQuestion {
    employeeId: string;
    employeeName: string;
    category: 'ATTENDANCE' | 'EXECUTION' | 'KRA_KPI' | 'PROJECTS' | 'INNOVATION';
    priority: RiskLevel;
    question: string;
    insight: string;
}

export interface IntelligenceSummary {
    overloadPredictions: OverloadPrediction[];
    depletionForecasts: DepletionForecast[];
    dispatchSuggestions: DispatchSuggestion[];
    employeePerformanceRisks: EmployeePerformanceRisk[];
    clarifyingQuestions: ClarifyingQuestion[];
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

export function predictEmployeePerformanceRisk(employees: EmployeeTwin[]): EmployeePerformanceRisk[] {
    return employees
        .filter((emp) => emp.status !== 'ON_LEAVE')
        .map((emp) => {
            let score = 0;
            const reasons: string[] = [];

            if (emp.status === 'OVERLOADED') {
                score += 35;
                reasons.push(`Employee is overloaded with ${emp.taskCount} open tasks.`);
            }
            if (emp.status === 'OFFLINE_ALERT') {
                score += 30;
                reasons.push('Employee is offline while work remains unresolved.');
            }
            if (emp.overdueTasks >= 3) {
                score += 20;
                reasons.push(`${emp.overdueTasks} overdue tasks need immediate follow-up.`);
            } else if (emp.overdueTasks > 0) {
                score += 10;
                reasons.push(`${emp.overdueTasks} overdue task${emp.overdueTasks > 1 ? 's' : ''} pending.`);
            }
            if (emp.avgKpiProgress < 40) {
                score += 18;
                reasons.push(`KPI progress is ${emp.avgKpiProgress.toFixed(0)}%, below threshold.`);
            } else if (emp.avgKpiProgress < 70) {
                score += 8;
            }
            if (emp.avgKraMatch30d < 0.45) {
                score += 16;
                reasons.push(`KRA alignment is ${(emp.avgKraMatch30d * 100).toFixed(0)}%.`);
            }
            if (emp.attendanceDays7d <= 2) {
                score += 14;
                reasons.push(`Attendance is low (${emp.attendanceDays7d}/7 days this week).`);
            }
            if (emp.workReports7d === 0) {
                score += 12;
                reasons.push('No work reports submitted this week.');
            }
            if (emp.disciplineScore < 50) {
                score += 14;
                reasons.push(`Discipline score is ${emp.disciplineScore.toFixed(0)}.`);
            }
            if ((emp.engagementScore || 0) < 45) {
                score += 12;
                reasons.push(`Engagement score is ${emp.engagementScore || 0}.`);
            }

            const normalized = Math.max(0, Math.min(100, Math.round(score)));
            const highThreshold = Math.max(40, Math.min(95, emp.riskThresholdHigh || 65));
            const mediumThreshold = Math.max(10, Math.min(highThreshold - 5, emp.riskThresholdMedium || 35));
            const risk: RiskLevel = normalized >= highThreshold ? 'HIGH' : normalized >= mediumThreshold ? 'MEDIUM' : 'LOW';

            return {
                employeeId: emp.id,
                employeeName: emp.name,
                risk,
                score: normalized,
                reasons,
            };
        })
        .filter((row) => row.risk !== 'LOW' || row.reasons.length > 0)
        .sort((a, b) => b.score - a.score);
}

export function generateClarifyingQuestions(employees: EmployeeTwin[]): ClarifyingQuestion[] {
    const questions: ClarifyingQuestion[] = [];

    for (const emp of employees) {
        if (emp.status === 'ON_LEAVE') continue;

        if (emp.attendanceDays7d <= 2 || emp.status === 'OFFLINE_ALERT') {
            questions.push({
                employeeId: emp.id,
                employeeName: emp.name,
                category: 'ATTENDANCE',
                priority: emp.attendanceDays7d <= 1 ? 'HIGH' : 'MEDIUM',
                question: 'What blocked your attendance consistency this week, and what support do you need to fix it?',
                insight: `Attendance is ${emp.attendanceDays7d}/7 with status ${emp.status}.`,
            });
        }

        if (emp.overdueTasks >= 2 || emp.disciplineScore < 50) {
            questions.push({
                employeeId: emp.id,
                employeeName: emp.name,
                category: 'EXECUTION',
                priority: emp.overdueTasks >= 3 ? 'HIGH' : 'MEDIUM',
                question: 'Which tasks are blocked right now, and what is your concrete recovery plan by end of day?',
                insight: `${emp.overdueTasks} overdue tasks and discipline score ${emp.disciplineScore.toFixed(0)}.`,
            });
        }

        if (emp.avgKpiProgress < 70 || emp.avgKraMatch30d < 0.6) {
            questions.push({
                employeeId: emp.id,
                employeeName: emp.name,
                category: 'KRA_KPI',
                priority: emp.avgKpiProgress < 40 || emp.avgKraMatch30d < 0.4 ? 'HIGH' : 'MEDIUM',
                question: 'Which KPI or KRA is currently off-track, and what weekly actions will move it back on target?',
                insight: `KPI ${emp.avgKpiProgress.toFixed(0)}% · KRA ${(emp.avgKraMatch30d * 100).toFixed(0)}%.`,
            });
        }

        if (emp.activeProjectsCount > 3 && emp.bandwidth < 35) {
            questions.push({
                employeeId: emp.id,
                employeeName: emp.name,
                category: 'PROJECTS',
                priority: 'MEDIUM',
                question: 'Which project priorities should be de-scoped or delegated to avoid overload this sprint?',
                insight: `${emp.activeProjectsCount} active projects with ${emp.bandwidth}% bandwidth.`,
            });
        }

        if (emp.thinkTankIdeas30d + emp.thinkTankVotes30d + emp.thinkTankQuestions30d + emp.thinkTankComments30d === 0) {
            questions.push({
                employeeId: emp.id,
                employeeName: emp.name,
                category: 'INNOVATION',
                priority: 'LOW',
                question: 'Is there a process or product improvement you can contribute to Think Tank this cycle?',
                insight: 'No recent think-tank contribution detected in last 30 days.',
            });
        }
    }

    return questions
        .sort((a, b) => {
            const rank: Record<RiskLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
            return rank[a.priority] - rank[b.priority];
        })
        .slice(0, 60);
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
        if (e.overdueTasks >= 3) penalty += 10;
        else if (e.overdueTasks > 0) penalty += 4;
        if (e.avgKpiProgress < 40) penalty += 10;
        else if (e.avgKpiProgress < 70) penalty += 5;
        if (e.avgKraMatch30d < 0.4) penalty += 8;
        if (e.attendanceDays7d <= 2) penalty += 6;
        if (e.disciplineScore < 50) penalty += 7;
        
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
        employeePerformanceRisks: predictEmployeePerformanceRisk(employees),
        clarifyingQuestions: generateClarifyingQuestions(employees),
        healthScore: computeHealthScore(employees, inventory),
    };
}
