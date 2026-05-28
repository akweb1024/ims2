import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { verifyTeamMemberAccess } from '@/lib/team-auth';

const ALLOWED_SENTIMENTS = new Set(['POSITIVE', 'NEGATIVE', 'NEUTRAL']);
const ALLOWED_CATEGORIES = new Set(['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'WEBSITE', 'SECURITY', 'BACKUP', 'CUSTOM']);

function parseDate(input: string | null) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function canTagEmployee(user: any, employeeUserId: string) {
  if (user.id === employeeUserId) return true;
  if (['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'].includes(user.role)) return true;
  if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
    return verifyTeamMemberAccess(user.id, employeeUserId);
  }
  return false;
}

export const GET = authorizedRoute([], async (req: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const from = parseDate(searchParams.get('from'));
    const to = parseDate(searchParams.get('to'));

    const where: any = {
      creatorUserId: user.id,
      ...(from || to
        ? {
            noteDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    if (employeeId) {
      where.taggedEmployees = {
        some: { employeeId: String(employeeId) }
      };
    }

    const notes = await prisma.privateDailyNote.findMany({
      where,
      include: {
        taggedEmployees: {
          include: {
            employee: {
              include: {
                user: { select: { id: true, name: true, email: true } },
                performanceSnapshots: {
                  orderBy: { calculatedAt: 'desc' },
                  take: 1,
                  select: { overallScore: true, month: true, year: true, performanceGrade: true }
                }
              }
            }
          }
        }
      },
      orderBy: [{ noteDate: 'desc' }, { createdAt: 'desc' }]
    });

    const categoryStats = notes.reduce((acc: Record<string, number>, n) => {
      const key = n.category || 'UNCATEGORIZED';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      notes,
      summary: {
        total: notes.length,
        positive: notes.filter((n) => n.sentiment === 'POSITIVE').length,
        negative: notes.filter((n) => n.sentiment === 'NEGATIVE').length,
        neutral: notes.filter((n) => n.sentiment === 'NEUTRAL').length,
        categories: categoryStats,
      }
    });
  } catch (error: any) {
    return createErrorResponse(error?.message || error);
  }
});

export const POST = authorizedRoute([], async (req: NextRequest, user: any) => {
  try {
    const body = await req.json();

    const title = String(body.title || '').trim();
    const note = String(body.note || '').trim();
    const categoryInput = String(body.category || 'CUSTOM').trim().toUpperCase();
    const customCategory = body.customCategory ? String(body.customCategory).trim() : null;
    const sentiment = String(body.sentiment || 'NEUTRAL').trim().toUpperCase();
    const noteDate = body.noteDate ? new Date(body.noteDate) : new Date();
    const performanceImpactScore = body.performanceImpactScore === undefined || body.performanceImpactScore === null
      ? null
      : Number(body.performanceImpactScore);
    const taggedEmployeeIds: string[] = Array.isArray(body.taggedEmployeeIds)
      ? Array.from(new Set((body.taggedEmployeeIds as any[]).map((id: any) => String(id).trim()).filter(Boolean) as string[]))
      : [];

    if (!title) return createErrorResponse('Title is required', 400);
    if (!note) return createErrorResponse('Note is required', 400);
    if (!taggedEmployeeIds.length) return createErrorResponse('Tag at least one employee', 400);
    if (!ALLOWED_CATEGORIES.has(categoryInput)) return createErrorResponse('Invalid category', 400);
    if (!ALLOWED_SENTIMENTS.has(sentiment)) return createErrorResponse('Invalid sentiment', 400);
    if (Number.isNaN(noteDate.getTime())) return createErrorResponse('Invalid noteDate', 400);

    const taggedEmployees = await prisma.employeeProfile.findMany({
      where: { id: { in: taggedEmployeeIds } },
      include: { user: { select: { id: true, companyId: true } } }
    });

    if (taggedEmployees.length !== taggedEmployeeIds.length) {
      return createErrorResponse('One or more tagged employees were not found', 404);
    }

    for (const emp of taggedEmployees) {
      if (user.companyId && emp.user.companyId && user.companyId !== emp.user.companyId && user.role !== 'SUPER_ADMIN') {
        return createErrorResponse('Cross-company tagging is not allowed', 403);
      }
      const allowed = await canTagEmployee(user, emp.user.id);
      if (!allowed) return createErrorResponse('You cannot tag one or more selected employees', 403);
    }

    const created = await prisma.privateDailyNote.create({
      data: {
        creatorUserId: user.id,
        companyId: user.companyId || null,
        title,
        note,
        category: categoryInput,
        customCategory: categoryInput === 'CUSTOM' ? (customCategory || null) : null,
        sentiment,
        noteDate,
        performanceImpactScore,
        taggedEmployees: {
          create: taggedEmployeeIds.map((employeeId) => ({
            employee: { connect: { id: employeeId } }
          }))
        }
      },
      include: {
        taggedEmployees: {
          include: { employee: { include: { user: { select: { id: true, name: true, email: true } } } } }
        }
      }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return createErrorResponse(error?.message || error);
  }
});
