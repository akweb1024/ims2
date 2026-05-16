import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import { prisma } from '@/lib/prisma';
import { resolveCompanyScope } from '@/lib/access-policy';
import { getEmployeeTwinStatus, getInventoryTwinStatus } from '@/lib/digital-twin/twin-engine';
import { runIntelligenceEngine } from '@/lib/digital-twin/intelligence';

export const POST = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN'],
  async (req: NextRequest, user) => {
    try {
      const { query, mode = 'SEARCH' } = await req.json();
      const companyId = await resolveCompanyScope(req, user);

      if (mode === 'AI') {
        // AI Logic: Analyze twin state to answer natural language query
        // For Phase 1, we use the Intelligence Engine + basic keyword matching
        const [employees, inventory] = await Promise.all([
          getEmployeeTwinStatus(companyId || ''),
          getInventoryTwinStatus(companyId || '')
        ]);

        const intel = runIntelligenceEngine(employees, inventory);

        // Mock AI reasoning based on data
        let answer = "I've analyzed the current system state. ";
        if (query.toLowerCase().includes('risk') || query.toLowerCase().includes('problem')) {
          const highRisks = intel.overloadPredictions.filter(p => p.risk === 'HIGH');
          answer += `There are ${highRisks.length} critical overload risks. ${highRisks.length > 0 ? `Specifically, ${highRisks[0].employeeName} is at capacity.` : 'System seems stable.'}`;
        } else if (query.toLowerCase().includes('stock') || query.toLowerCase().includes('inventory')) {
          const criticalItems = intel.depletionForecasts.filter(f => f.risk === 'HIGH');
          answer += `Inventory check: ${criticalItems.length} items are nearing depletion. I recommend restocking ${criticalItems.slice(0, 2).map(i => i.itemName).join(', ')}.`;
        } else {
          answer += `The overall system health score is ${intel.healthScore}/100. How can I help you navigate the data?`;
        }

        return NextResponse.json({
          type: 'AI_RESPONSE',
          content: answer,
          suggestions: intel.clarifyingQuestions.slice(0, 3).map(q => q.question)
        });
      }

      // Default: SEARCH mode
      const [users, customers, journals] = await Promise.all([
        prisma.user.findMany({
          where: {
            name: { contains: query, mode: 'insensitive' },
            companyId: companyId || undefined
          },
          take: 5
        }),
        prisma.customerProfile.findMany({
          where: {
            name: { contains: query, mode: 'insensitive' },
            companyId: companyId || undefined
          },
          take: 5
        }),
        prisma.journal.findMany({
          where: {
            name: { contains: query, mode: 'insensitive' }
          },
          take: 5
        })
      ]);

      const results = [
        ...users.map(u => ({ id: u.id, title: u.name, subtitle: u.role, type: 'EMPLOYEE', url: `/dashboard/hr-management/employees/${u.id}` })),
        ...customers.map(c => ({ id: c.id, title: c.name, subtitle: c.organizationName, type: 'CUSTOMER', url: `/dashboard/customers/${c.id}` })),
        ...journals.map(j => ({ id: j.id, title: j.name, subtitle: j.subjectCategory, type: 'JOURNAL', url: `/journals/${j.id}` }))
      ];

      return NextResponse.json({ results });

    } catch (error) {
      return handleApiError(error, req.nextUrl.pathname);
    }
  }
);
