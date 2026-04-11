import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const POST = authorizedRoute(['SUPER_ADMIN'], async (_req: NextRequest) => {
    try {
        // Get all active cycles
        const cycles = await prisma.thinkTankIdeaCycle.findMany({
            orderBy: { windowStart: 'desc' }
        });

        // Group by exact windowStart + windowEnd timeframe
        const groups: Record<string, typeof cycles> = {};
        for (const c of cycles) {
            const key = `${c.windowStart.getTime()}-${c.windowEnd.getTime()}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(c);
        }

        let mergedCount = 0;
        const consolidatedInfo: { window: Date; mergedDuplicates: number }[] = [];

        for (const key in groups) {
            const group = groups[key];
            if (group.length > 1) {
                // Pick the first one as the primary global cycle
                const primary = group[0];
                const others = group.slice(1);
                
                for (const other of others) {
                    await prisma.$transaction(async (tx) => {
                        // Update Ideas
                        await tx.thinkTankIdea.updateMany({
                            where: { cycleId: other.id },
                            data: { cycleId: primary.id }
                        });
                        
                        // Update Votes
                        await tx.thinkTankIdeaVote.updateMany({
                            where: { cycleId: other.id },
                            data: { cycleId: primary.id }
                        });
                        
                        // Update Point Accounts
                        const pointAccounts = await tx.thinkTankPointAccount.findMany({
                            where: { cycleId: other.id }
                        });
                        
                        for (const pa of pointAccounts) {
                            const existing = await tx.thinkTankPointAccount.findUnique({
                                where: { cycleId_userId: { cycleId: primary.id, userId: pa.userId } }
                            });
                            if (!existing) {
                                await tx.thinkTankPointAccount.update({
                                    where: { id: pa.id },
                                    data: { cycleId: primary.id }
                                });
                            } else {
                                await tx.thinkTankPointAccount.update({
                                    where: { id: existing.id },
                                    data: { 
                                        allocatedPoints: Math.max(existing.allocatedPoints, pa.allocatedPoints),
                                        remainingPoints: Math.min(existing.remainingPoints, pa.remainingPoints)
                                    }
                                });
                                await tx.thinkTankPointAccount.delete({ where: { id: pa.id } });
                            }
                        }
                        
                        // Delete the duplicate cycle
                        await tx.thinkTankIdeaCycle.delete({
                            where: { id: other.id }
                        });
                    });
                    mergedCount++;
                }
                consolidatedInfo.push({ window: primary.windowStart, mergedDuplicates: others.length });
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Successfully merged ${mergedCount} duplicate cycles.`,
            details: consolidatedInfo
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
