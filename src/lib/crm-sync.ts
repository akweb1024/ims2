import { prisma } from './prisma';
import { updateLeadScore } from './crm-scoring';

type LeadSource = 'CONFERENCE_REGISTRATION' | 'COURSE_ENROLLMENT' | 'MANUAL' | 'EXTERNAL_API';

interface LeadData {
    name: string;
    email: string;
    phone?: string;
    organization?: string;
    source: LeadSource;
    notes?: string;
    companyId: string;
}

const LEAD_ASSIGNMENT_CURSOR_KEY = 'lead_assignment_cursor';
const LEAD_ASSIGNMENT_CATEGORY = 'CRM';

/**
 * Ensures a lead exists in the CRM and is assigned to an executive.
 * Used for cross-module integration (Conferences, LMS, etc).
 */
export async function syncToCrmLead(data: LeadData) {
    try {
        // 1. Check if lead already exists
        let lead = await prisma.customerProfile.findFirst({
            where: {
                primaryEmail: data.email,
                companyId: data.companyId
            }
        });

        if (lead) {
            // Update source if it was direct/manual
            if (lead.source === 'DIRECT' || lead.source === 'UNKNOWN') {
                await prisma.customerProfile.update({
                    where: { id: lead.id },
                    data: { source: data.source }
                });
            }
            return lead;
        }

        // 2. Identify next assignment (Round-Robin)
        const assignedToUserId = await getNextExecutiveId(data.companyId);

        // 3. Create the Lead
        // Note: CustomerProfile requires a userId. For auto-leads, we might need a placeholder or link to the user if they registered.
        // If the user doesn't have a login yet, we use a system/placeholder ID or make it optional in the sync.
        // In this schema, CustomerProfile -> User is a required relation.
        
        // We'll search for a User with this email first
        const user = await prisma.user.findUnique({ where: { email: data.email } });
        
        if (!user) {
            // If no user exists, we can't create a CustomerProfile in THIS schema because of the required userId.
            // FIX: We must either create a guest user or ensure the registration flow creates a user first.
            // For now, let's assume we create a minimal guest user if needed or the caller provides the userId.
            console.warn(`CRM Sync: User with email ${data.email} not found. Cannot create CustomerProfile lead.`);
            return null;
        }

        lead = await prisma.customerProfile.create({
            data: {
                name: data.name,
                primaryEmail: data.email,
                primaryPhone: data.phone || '',
                organizationName: data.organization,
                source: data.source,
                notes: data.notes,
                companyId: data.companyId,
                userId: user.id,
                leadStatus: 'NEW',
                assignedToUserId: assignedToUserId, // Assign to executive
            }
        });

        // 4. Update Lead Score
        await updateLeadScore(lead.id);

        return lead;
    } catch (error) {
        console.error('CRM Sync Error:', error);
        return null;
    }
}

/**
 * Logic to get the next executive in the round-robin queue.
 */
async function getNextExecutiveId(companyId: string): Promise<string | null> {
    try {
        // Get all active executives
        const executives = await prisma.user.findMany({
            where: {
                companyId,
                isActive: true,
                role: 'EXECUTIVE',
            },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });

        if (executives.length === 0) return null;

        // Get current cursor
        const cursor = await prisma.appConfiguration.findUnique({
            where: {
                companyId_category_key: {
                  companyId,
                  category: LEAD_ASSIGNMENT_CATEGORY,
                  key: LEAD_ASSIGNMENT_CURSOR_KEY,
                },
            }
        });

        const currentId = cursor?.value;
        let nextExecutive;

        if (!currentId) {
            nextExecutive = executives[0];
        } else {
            const currentIndex = executives.findIndex(e => e.id === currentId);
            const nextIndex = (currentIndex + 1) % executives.length;
            nextExecutive = executives[nextIndex];
        }

        // Update cursor
        await prisma.appConfiguration.upsert({
            where: {
                companyId_category_key: {
                  companyId,
                  category: LEAD_ASSIGNMENT_CATEGORY,
                  key: LEAD_ASSIGNMENT_CURSOR_KEY,
                },
            },
            update: { value: nextExecutive.id },
            create: {
                companyId,
                category: LEAD_ASSIGNMENT_CATEGORY,
                key: LEAD_ASSIGNMENT_CURSOR_KEY,
                value: nextExecutive.id,
                description: 'Round-robin assignment cursor'
            }
        });

        return nextExecutive.id;
    } catch (error) {
        console.error('Round-Robin Assignment Error:', error);
        return null;
    }
}
