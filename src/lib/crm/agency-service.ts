import { prisma } from '@/lib/prisma';
import { AgencyDetails, AgencyPerformance, Prisma } from '@prisma/client';

export class AgencyService {
    /**
     * Calculate profile completion percentage
     */
    private static calculateProfileCompletion(details: AgencyDetails): number {
        const fields = [
            'companyInfo', 'territory', 'region', 'primaryContact',
            'commissionTerms', 'yearsOfExperience', 'gstNumber'
        ];

        // Count filled fields
        let filled = 0;
        fields.forEach(field => {
            if (details[field as keyof AgencyDetails]) filled++;
        });

        // Check arrays
        if (details.workingRegions && details.workingRegions.length > 0) filled++;
        if (details.institutionTypes && details.institutionTypes.length > 0) filled++;

        const total = fields.length + 2; // +2 for arrays
        return Math.round((filled / total) * 100);
    }

    /**
     * Update or Create Agency Performance Record
     */
    static async updatePerformance(agencyDetailsId: string, data?: Partial<AgencyPerformance>) {
        const details = await prisma.agencyDetails.findUnique({
            where: { id: agencyDetailsId },
            include: { performance: true }
        });

        if (!details) throw new Error('Agency not found');

        // Calculate auto-metrics
        const profileCompletion = this.calculateProfileCompletion(details);

        // Determine risk flag
        // Determine risk flag
        const riskFlag = details.hasPaymentDisputes || (details.creditLimit > 0 && details.creditLimit < 1000);
        if (riskFlag !== details.riskFlag) {
            await prisma.agencyDetails.update({
                where: { id: agencyDetailsId },
                data: { riskFlag }
            });
        }

        // Prepare performance data
        // Exclude ID fields from spread to avoid 'Unchecked' vs 'Checked' input conflicts
        const { agencyDetailsId: _adId, id: _id, ...cleanData } = data || {} as any;

        const performanceData: Prisma.AgencyPerformanceCreateInput = {
            agencyDetails: { connect: { id: agencyDetailsId } },
            profileCompletion,
            ...cleanData
        };

        const updateData: Prisma.AgencyPerformanceUpdateInput = {
            profileCompletion,
            ...cleanData
        };

        return await prisma.agencyPerformance.upsert({
            where: { agencyDetailsId },
            create: performanceData,
            update: updateData
        });
    }

    /**
     * Check for inactive agencies (No communication in 30 days)
     */
    static async checkInactivity() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const agencies = await prisma.agencyDetails.findMany({
            include: {
                customerProfile: {
                    include: {
                        communications: {
                            orderBy: { date: 'desc' },
                            take: 1
                        }
                    }
                }
            }
        });

        const inactiveAgencies = agencies.filter(agency => {
            const lastComm = agency.customerProfile.communications[0];
            if (!lastComm) return true; // No comms ever
            return new Date(lastComm.date) < thirtyDaysAgo;
        });

        return inactiveAgencies;
    }

    /**
     * Get Full Agency Profile with Performance
     */
    static async getAgencyProfile(id: string) {
        return await prisma.agencyDetails.findUnique({
            where: { id },
            include: {
                customerProfile: true,
                performance: true,
                subscriptions: {
                    where: { status: 'ACTIVE' }
                }
            }
        });
    }
}
