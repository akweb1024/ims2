import { getChecklistItemById } from '@/config/checklistItems';

export interface PredictionResult {
    renewalLikelihood: number;
    upsellPotential: number;
    churnRisk: number;
    customerHealth: 'EXCELLENT' | 'GOOD' | 'AT_RISK' | 'CRITICAL';
    insights: string[];
    recommendedActions: string[];
}

/**
 * Calculate behavior predictions based on checked checklist items
 * @param checkedItems Array of checked item IDs
 * @param historicalData Optional historical checklist data for better predictions
 * @returns Prediction scores and recommendations
 */
export function calculatePredictions(
    checkedItems: string[],
    historicalData?: any[]
): PredictionResult {
    // Base scores
    let renewalScore = 50;
    let upsellScore = 40;
    const insights: string[] = [];
    const recommendedActions: string[] = [];

    // Calculate weights from checked items
    let sentimentWeight = 0;
    let engagementWeight = 0;
    let businessWeight = 0;
    let actionWeight = 0;

    checkedItems.forEach(itemId => {
        const item = getChecklistItemById(itemId);
        if (!item) return;

        switch (item.category) {
            case 'sentiment':
                sentimentWeight += item.weight;
                break;
            case 'engagement':
                engagementWeight += item.weight;
                break;
            case 'business':
                businessWeight += item.weight;
                break;
            case 'action':
                actionWeight += item.weight;
                break;
        }
    });

    // Apply weights to renewal likelihood
    renewalScore += sentimentWeight * 3; // Sentiment has 3x multiplier
    renewalScore += engagementWeight * 2.5; // Engagement has 2.5x multiplier
    renewalScore += businessWeight * 1.5; // Business context has 1.5x multiplier

    // Apply weights to upsell potential
    upsellScore += businessWeight * 3; // Business context is key for upsell
    upsellScore += engagementWeight * 2; // Engagement matters for upsell
    upsellScore += sentimentWeight * 1.5; // Sentiment has some impact

    // Historical adjustment (if available)
    if (historicalData && historicalData.length > 0) {
        const avgHistoricalRenewal = historicalData.reduce((sum, d) => sum + (d.renewalLikelihood || 50), 0) / historicalData.length;
        const avgHistoricalUpsell = historicalData.reduce((sum, d) => sum + (d.upsellPotential || 40), 0) / historicalData.length;

        // Blend current with historical (70% current, 30% historical)
        renewalScore = renewalScore * 0.7 + avgHistoricalRenewal * 0.3;
        upsellScore = upsellScore * 0.7 + avgHistoricalUpsell * 0.3;
    }

    // Clamp scores to 0-100
    renewalScore = Math.max(0, Math.min(100, renewalScore));
    upsellScore = Math.max(0, Math.min(100, upsellScore));

    // Calculate churn risk (inverse of renewal)
    const churnScore = Math.max(0, Math.min(100, 100 - (renewalScore * 0.7 + engagementWeight * 3)));

    // Determine customer health
    let customerHealth: 'EXCELLENT' | 'GOOD' | 'AT_RISK' | 'CRITICAL';
    if (renewalScore > 80 && churnScore < 20) {
        customerHealth = 'EXCELLENT';
    } else if (renewalScore > 60 && churnScore < 40) {
        customerHealth = 'GOOD';
    } else if (renewalScore > 40 && churnScore < 60) {
        customerHealth = 'AT_RISK';
    } else {
        customerHealth = 'CRITICAL';
    }

    // Generate insights
    if (sentimentWeight > 15) {
        insights.push('Strong positive sentiment detected');
    } else if (sentimentWeight < -10) {
        insights.push('Customer expressing concerns - immediate attention needed');
    }

    if (engagementWeight > 20) {
        insights.push('High engagement signals - customer is actively using the product');
    } else if (engagementWeight < -5) {
        insights.push('Low engagement detected - consider re-engagement campaign');
    }

    if (businessWeight > 15) {
        insights.push('Excellent upsell opportunity - organization is growing');
    }

    if (renewalScore > 75) {
        insights.push('High renewal likelihood - maintain current relationship');
    } else if (renewalScore < 40) {
        insights.push('Renewal at risk - escalate to senior account manager');
    }

    // Generate recommended actions
    if (checkedItems.includes('action_demo')) {
        recommendedActions.push('Schedule product demo within 48 hours');
    }
    if (checkedItems.includes('action_pricing')) {
        recommendedActions.push('Prepare and send detailed pricing proposal');
    }
    if (checkedItems.includes('action_technical')) {
        recommendedActions.push('Arrange technical consultation call');
    }
    if (checkedItems.includes('business_decision_maker')) {
        recommendedActions.push('Engage decision maker for strategic discussion');
    }
    if (checkedItems.includes('business_multi_year')) {
        recommendedActions.push('Prepare multi-year commitment proposal with incentives');
    }
    if (checkedItems.includes('sentiment_considering_alternatives')) {
        recommendedActions.push('URGENT: Competitive threat - schedule retention call');
    }
    if (churnScore > 60) {
        recommendedActions.push('HIGH PRIORITY: Customer at risk - executive escalation recommended');
    }
    if (upsellScore > 70) {
        recommendedActions.push('Strong upsell opportunity - prepare expansion proposal');
    }

    // Default action if none specific
    if (recommendedActions.length === 0) {
        recommendedActions.push('Continue regular follow-up cadence');
    }

    return {
        renewalLikelihood: Math.round(renewalScore * 10) / 10,
        upsellPotential: Math.round(upsellScore * 10) / 10,
        churnRisk: Math.round(churnScore * 10) / 10,
        customerHealth,
        insights,
        recommendedActions
    };
}

/**
 * Get color class for score display
 */
export function getScoreColor(score: number, inverse: boolean = false): string {
    const threshold = inverse ?
        { excellent: 20, good: 40, warning: 60 } :
        { excellent: 80, good: 60, warning: 40 };

    if (inverse) {
        if (score < threshold.excellent) return 'text-green-600';
        if (score < threshold.good) return 'text-yellow-600';
        if (score < threshold.warning) return 'text-orange-600';
        return 'text-red-600';
    } else {
        if (score >= threshold.excellent) return 'text-green-600';
        if (score >= threshold.good) return 'text-yellow-600';
        if (score >= threshold.warning) return 'text-orange-600';
        return 'text-red-600';
    }
}

/**
 * Get background color class for score display
 */
export function getScoreBgColor(score: number, inverse: boolean = false): string {
    const threshold = inverse ?
        { excellent: 20, good: 40, warning: 60 } :
        { excellent: 80, good: 60, warning: 40 };

    if (inverse) {
        if (score < threshold.excellent) return 'bg-green-100';
        if (score < threshold.good) return 'bg-yellow-100';
        if (score < threshold.warning) return 'bg-orange-100';
        return 'bg-red-100';
    } else {
        if (score >= threshold.excellent) return 'bg-green-100';
        if (score >= threshold.good) return 'bg-yellow-100';
        if (score >= threshold.warning) return 'bg-orange-100';
        return 'bg-red-100';
    }
}

/**
 * Get health badge color
 */
export function getHealthBadgeColor(health: string): string {
    switch (health) {
        case 'EXCELLENT':
            return 'bg-green-100 text-green-800 border-green-200';
        case 'GOOD':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'AT_RISK':
            return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'CRITICAL':
            return 'bg-red-100 text-red-800 border-red-200';
        default:
            return 'bg-gray-100 text-gray-800 border-gray-200';
    }
}
