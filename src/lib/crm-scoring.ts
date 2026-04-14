import { prisma } from './prisma';

/**
 * Calculates a lead score (0-100) based on activity and profile metadata.
 * Criteria:
 * - Engagement: +15 points per unique communication event (max 45)
 * - Profile Depth: +10 points if organizationName exists
 * - Opportunity: +30 points if they have any open Deals
 * - Qualification: +15 points if source is specified
 */
export async function calculateLeadScore(leadId: string): Promise<number> {
    try {
        const lead = await prisma.customerProfile.findUnique({
            where: { id: leadId },
            include: {
                communications: { take: 10 },
                deals: {
                    where: { stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } }
                }
            }
        });

        if (!lead) return 0;

        let score = 0;

        // 1. Engagement (Activity) - Max 45
        const commCount = lead.communications.length;
        score += Math.min(commCount * 15, 45);

        // 2. Profile Depth - +10
        if (lead.organizationName && lead.organizationName.trim() !== '') {
            score += 10;
        }

        // 3. Opportunity - +30
        if (lead.deals.length > 0) {
            score += 30;
        }

        // 4. Qualification - +15
        if (lead.source && lead.source !== 'UNKNOWN') {
            score += 15;
        }

        return Math.min(score, 100);
    } catch (error) {
        console.error('Lead scoring error:', error);
        return 0;
    }
}

/**
 * Updates the lead score in the database.
 */
export async function updateLeadScore(leadId: string): Promise<number> {
    const score = await calculateLeadScore(leadId);
    
    await prisma.customerProfile.update({
        where: { id: leadId },
        data: { leadScore: score }
    });

    return score;
}
