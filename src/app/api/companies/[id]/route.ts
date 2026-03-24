import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'],
    async (req: NextRequest, decoded, { params }) => {
        try {
            const { id } = await params;

            // Security check: Only SUPER_ADMIN or users of that company
            if (decoded.role !== 'SUPER_ADMIN' && decoded.companyId !== id) {
                return createErrorResponse('Forbidden', 403);
            }

            const [company, revenueAgg, projectCount, ticketCount, recentProjects, recentTickets, recentRevenue, performance, relationshipOwner] = await Promise.all([
                prisma.company.findUnique({
                    where: { id },
                    include: {
                        _count: {
                            select: {
                                users: true,
                                departments: true
                            }
                        }
                    }
                }),
                prisma.revenueTransaction.aggregate({
                    where: { companyId: id, status: 'VERIFIED' },
                    _sum: { amount: true }
                }),
                prisma.iTProject.count({
                    where: { companyId: id, status: { notIn: ['COMPLETED', 'CANCELLED'] } }
                }),
                prisma.iTSupportTicket.count({
                    where: { companyId: id, status: { notIn: ['RESOLVED', 'CLOSED'] } }
                }),
                prisma.iTProject.findMany({
                    where: { companyId: id },
                    orderBy: { createdAt: 'desc' },
                    take: 3
                }),
                prisma.iTSupportTicket.findMany({
                    where: { companyId: id },
                    orderBy: { createdAt: 'desc' },
                    take: 3
                }),
                prisma.revenueTransaction.findMany({
                    where: { companyId: id },
                    orderBy: { createdAt: 'desc' },
                    take: 3
                }),
                prisma.companyPerformance.findMany({
                    where: { companyId: id },
                    orderBy: [
                        { year: 'desc' },
                        { month: 'desc' }
                    ],
                    take: 6
                }),
                prisma.user.findFirst({
                    where: {
                        companyId: id,
                        isActive: true,
                        role: {
                            in: ['ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'EXECUTIVE']
                        }
                    },
                    orderBy: [
                        { role: 'asc' },
                        { createdAt: 'asc' }
                    ],
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                })
            ]);

            if (!company) return createErrorResponse('Company not found', 404);

            const latestPerformance = performance[0] || null;
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            const trendData = [...performance].reverse().map(p => ({
                month: monthNames[p.month - 1] || `M${p.month}`,
                revenue: p.totalRevenue
            }));

            // Combine and format recent activity
            const recentActivity = [
                ...recentProjects.map((p: any) => ({ id: `p-${p.id}`, title: `Project "${p.name}" ${p.status.toLowerCase()}`, date: p.createdAt, type: 'project' })),
                ...recentTickets.map((t: any) => ({ id: `t-${t.id}`, title: `Ticket "${t.title}" ${t.status.toLowerCase()}`, date: t.createdAt, type: 'ticket' })),
                ...recentRevenue.map((r: any) => ({ id: `r-${r.id}`, title: `Revenue transaction ₹${r.amount} ${r.status.toLowerCase()}`, date: r.createdAt, type: 'finance' }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

            const renewalProbability = Math.max(35, Math.min(
                98,
                Math.round(
                    (latestPerformance?.satisfactionScore || 60) * 0.45 +
                    (latestPerformance?.taskCompletionRate || 50) * 0.2 +
                    (latestPerformance?.attendanceRate || 70) * 0.15 +
                    Math.max(0, latestPerformance?.monthOverMonthGrowth || 0) * 0.2
                )
            ));

            const churnRisk =
                (latestPerformance?.satisfactionScore || 0) >= 80 && (latestPerformance?.attritionRate || 0) < 10
                    ? 'Low'
                    : (latestPerformance?.satisfactionScore || 0) >= 60
                        ? 'Medium'
                        : 'High';

            const upsellOpportunity =
                (latestPerformance?.profitMargin || 0) >= 20 && (latestPerformance?.monthOverMonthGrowth || 0) >= 0
                    ? 'High'
                    : (latestPerformance?.profitMargin || 0) >= 10
                        ? 'Moderate'
                        : 'Low';

            const aiRecommendation =
                projectCount > 0
                    ? 'Focus on delivery updates and milestone communication to maintain confidence.'
                    : ticketCount > 0
                        ? 'Prioritize support resolution and close the feedback loop with stakeholders.'
                        : (latestPerformance?.satisfactionScore || 0) >= 80
                            ? 'This account looks healthy. Use the next check-in to explore expansion opportunities.'
                            : 'Schedule a relationship review with key stakeholders and document current blockers.';

            const responseData = {
                ...company,
                stats: {
                    totalRevenue: revenueAgg._sum.amount || 0,
                    activeProjects: projectCount,
                    openTickets: ticketCount,
                    healthScore: latestPerformance?.satisfactionScore || 85,
                    totalEmployees: company._count.users || 0
                },
                recentActivity,
                recentProjects: recentProjects.map((project: any) => ({
                    id: project.id,
                    name: project.name,
                    status: project.status,
                    priority: project.priority,
                    startDate: project.startDate,
                    endDate: project.endDate,
                    createdAt: project.createdAt,
                })),
                recentTickets: recentTickets.map((ticket: any) => ({
                    id: ticket.id,
                    title: ticket.title,
                    status: ticket.status,
                    priority: ticket.priority,
                    category: ticket.category,
                    createdAt: ticket.createdAt,
                })),
                recentRevenue: recentRevenue.map((transaction: any) => ({
                    id: transaction.id,
                    amount: transaction.amount,
                    status: transaction.status,
                    paymentMethod: transaction.paymentMethod,
                    description: transaction.description,
                    createdAt: transaction.createdAt,
                })),
                relationshipOwner: relationshipOwner ? {
                    id: relationshipOwner.id,
                    name: relationshipOwner.name || relationshipOwner.email,
                    email: relationshipOwner.email,
                    role: relationshipOwner.role
                } : null,
                trendData,
                sentiment: {
                    score: latestPerformance?.averagePerformance ? latestPerformance.averagePerformance * 10 : 75,
                    trend: latestPerformance?.monthOverMonthGrowth && latestPerformance.monthOverMonthGrowth > 0 ? 'UP' : 'STABLE',
                    breakdown: {
                        positive: latestPerformance?.satisfactionScore || 70,
                        neutral: 20,
                        negative: 10
                    },
                    keywords: ['Reliable', 'Active', 'Growing']
                },
                intelligence: {
                    renewalProbability,
                    churnRisk,
                    upsellOpportunity,
                    recommendation: aiRecommendation,
                    topDepartment: latestPerformance?.topDepartment || null,
                    topPerformer: latestPerformance?.topPerformer || null,
                    reportSubmissionRate: latestPerformance?.reportSubmissionRate || 0,
                    taskCompletionRate: latestPerformance?.taskCompletionRate || 0,
                    attendanceRate: latestPerformance?.attendanceRate || 0,
                    profitMargin: latestPerformance?.profitMargin || 0,
                    revenuePerEmployee: latestPerformance?.revenuePerEmployee || 0,
                }
            };

            return NextResponse.json(responseData);
        } catch (error) {
            console.error('Get Company Details Error:', error);
            return createErrorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, decoded, { params }) => {
        try {
            const { id } = await params;

            // Security check: Non-super-admins can only update their own company
            if (decoded.role !== 'SUPER_ADMIN' && decoded.companyId !== id) {
                return createErrorResponse('Forbidden', 403);
            }

            const body = await req.json();
            const {
                name, domain, email, phone, address, website, currency, timezone, fiscalYearStart,
                // Invoice identity fields
                legalEntityName, tagline, logoUrl,
                gstin, stateCode, cinNo, panNo, iecCode,
                bankName, bankAccountHolder, bankAccountNumber, bankIfscCode, bankSwiftCode,
                paymentMode, brandRelationType, invoiceCompanyLogoUrl,
                regdOfficeAddress, salesOfficeAddress, invoiceTerms
            } = body;

            const company = await prisma.company.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(domain !== undefined && { domain }),
                    ...(email !== undefined && { email }),
                    ...(phone !== undefined && { phone }),
                    ...(address !== undefined && { address }),
                    ...(website !== undefined && { website }),
                    ...(currency && { currency }),
                    ...(timezone && { timezone }),
                    ...(fiscalYearStart !== undefined && { fiscalYearStart }),
                    // Invoice identity fields
                    ...(legalEntityName !== undefined && { legalEntityName }),
                    ...(tagline !== undefined && { tagline }),
                    ...(logoUrl !== undefined && { logoUrl }),
                    ...(gstin !== undefined && { gstin }),
                    ...(stateCode !== undefined && { stateCode }),
                    ...(cinNo !== undefined && { cinNo }),
                    ...(panNo !== undefined && { panNo }),
                    ...(iecCode !== undefined && { iecCode }),
                    ...(bankName !== undefined && { bankName }),
                    ...(bankAccountHolder !== undefined && { bankAccountHolder }),
                    ...(bankAccountNumber !== undefined && { bankAccountNumber }),
                    ...(bankIfscCode !== undefined && { bankIfscCode }),
                    ...(bankSwiftCode !== undefined && { bankSwiftCode }),
                    ...(paymentMode !== undefined && { paymentMode }),
                    ...(brandRelationType !== undefined && { brandRelationType }),
                    ...(invoiceCompanyLogoUrl !== undefined && { invoiceCompanyLogoUrl }),
                    ...(regdOfficeAddress !== undefined && { regdOfficeAddress }),
                    ...(salesOfficeAddress !== undefined && { salesOfficeAddress }),
                    ...(invoiceTerms !== undefined && { invoiceTerms }),
                },
                include: {
                    _count: {
                        select: {
                            users: true,
                            departments: true
                        }
                    }
                }
            });

            // Audit log
            await prisma.auditLog.create({
                data: {
                    userId: decoded.id,
                    action: 'update',
                    entity: 'company',
                    entityId: id,
                    changes: JSON.stringify(body)
                }
            });

            return NextResponse.json(company);
        } catch (error) {
            console.error('Update Company Error:', error);
            return createErrorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
        }
    }
);
