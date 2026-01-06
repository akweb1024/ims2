
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!user.companyId) return NextResponse.json({ error: 'Members of companies only' }, { status: 403 });

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // 1. Fetch Tasks Completed Today
        const completedTasks = await prisma.task.findMany({
            where: {
                userId: user.id,
                status: 'COMPLETED',
                updatedAt: { gte: todayStart, lte: todayEnd }
            }
        });

        // 2. Fetch Tasks In Progress
        const pendingTasks = await prisma.task.findMany({
            where: {
                userId: user.id,
                status: 'IN_PROGRESS'
            }
        });

        // 3. Fetch Communications (Calls/Emails) - Sales Activity
        const comms = await prisma.communicationLog.findMany({
            where: {
                userId: user.id,
                date: { gte: todayStart, lte: todayEnd }
            },
            include: { customerProfile: { select: { name: true } } }
        });

        // 4. Fetch Revenue (Subscriptions sold as Sales Exec)
        const subscriptions = await prisma.subscription.findMany({
            where: {
                salesExecutiveId: user.id,
                createdAt: { gte: todayStart, lte: todayEnd }
            },
            include: { customerProfile: { select: { name: true } } }
        });

        // 5. Fetch Resolved Tickets (Support)
        const resolvedTickets = await prisma.supportTicket.findMany({
            where: {
                assignedToId: user.id,
                status: { in: ['RESOLVED', 'CLOSED'] },
                updatedAt: { gte: todayStart, lte: todayEnd }
            }
        });

        // 6. Fetch Chats Handled (Support/Sales)
        // Logic: Count rooms where user sent a message today
        const activeChats = await prisma.chatMessage.findMany({
            where: {
                senderId: user.id,
                createdAt: { gte: todayStart, lte: todayEnd }
            },
            distinct: ['roomId']
        });

        // 7. Fetch Follow-ups Completed
        const completedFollowUps = await prisma.communicationLog.findMany({
            where: {
                userId: user.id,
                isFollowUpCompleted: true,
                updatedAt: { gte: todayStart, lte: todayEnd }
            }
        });

        const totalRevenue = subscriptions.reduce((acc, sub) => acc + sub.total, 0);

        // 8. Build AI-like Summary
        const summaryParts: string[] = [];
        let keyOutcome = "";

        if (subscriptions.length > 0) {
            summaryParts.push(`💰 **Revenue Impact**: Generated ₹${totalRevenue.toLocaleString()} from ${subscriptions.length} new subscription(s) (${subscriptions.map(s => s.customerProfile.name).join(', ')}).`);
            keyOutcome = `Generated ₹${totalRevenue.toLocaleString()} Revenue`;
        }

        if (resolvedTickets.length > 0) {
            summaryParts.push(`🎟️ **Support Tickets**: Resolved ${resolvedTickets.length} tickets (${resolvedTickets.map(t => t.subject).slice(0, 3).join(', ')}...).`);
            if (!keyOutcome) keyOutcome = `Resolved ${resolvedTickets.length} Support Tickets`;
        }

        if (activeChats.length > 0) {
            summaryParts.push(`💬 **Live Chat**: Handled inquiries in ${activeChats.length} active chat sessions.`);
        }

        if (completedFollowUps.length > 0) {
            summaryParts.push(`↩️ **Follow-ups**: Completed ${completedFollowUps.length} scheduled follow-ups.`);
        }

        if (completedTasks.length > 0) {
            summaryParts.push(`✅ **Completed Tasks**: ${completedTasks.map(t => t.title).join(', ')}.`);
            if (!keyOutcome) keyOutcome = `Completed ${completedTasks.length} Assigned Tasks`;
        }

        if (pendingTasks.length > 0) {
            summaryParts.push(`🔄 **Work In Progress**: Currently working on ${pendingTasks.map(t => t.title).join(', ')}.`);
        }

        if (comms.length > 0) {
            const calls = comms.filter(c => c.type === 'CALL').length;
            const emails = comms.filter(c => c.type === 'EMAIL').length;
            summaryParts.push(`📞 **Client Engagement**: Logged ${comms.length} interactions (${calls} Calls, ${emails} Emails). Engaged with ${[...new Set(comms.map(c => c.customerProfile.name))].slice(0, 3).join(', ')}.`);
            if (!keyOutcome) keyOutcome = `Engaged with ${comms.length} Clients`;
        }

        if (summaryParts.length === 0) {
            summaryParts.push("Start of day. No digital activity logged yet.");
        }

        return NextResponse.json({
            content: summaryParts.join('\n\n'),
            keyOutcome: keyOutcome || "Routine Operations",
            revenue: totalRevenue,
            tasksCount: completedTasks.length,
            ticketsCount: resolvedTickets.length,
            chatsCount: activeChats.length,
            followUpsCount: completedFollowUps.length,
            hoursEstimated: 8 // Default
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
