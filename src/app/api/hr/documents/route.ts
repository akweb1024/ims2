import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');

            if (!employeeId) {
                return createErrorResponse('Employee ID required', 400);
            }

            // Manager Check
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const allowedIds = [...subIds, user.id];
                const targetEmp = await prisma.employeeProfile.findUnique({ where: { id: employeeId }, select: { userId: true } });
                if (!targetEmp || !allowedIds.includes(targetEmp.userId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            const documents = await prisma.employeeDocument.findMany({
                where: { employeeId },
                orderBy: { uploadedAt: 'desc' }
            });

            return NextResponse.json(documents);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { employeeId, name, fileUrl, fileType, documentType } = body;

            if (!employeeId || !name || !fileUrl) {
                return createErrorResponse('employeeId, name and fileUrl are required', 400);
            }

            const targetEmp = await prisma.employeeProfile.findUnique({
                where: { id: employeeId },
                select: { userId: true }
            });

            if (!targetEmp) return createErrorResponse('Employee not found', 404);

            // Access Control: Manager/TL can only upload for their own team
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                if (!subIds.includes(targetEmp.userId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            // New documents start unverified; an authorised reviewer must verify them.
            const doc = await prisma.employeeDocument.create({
                data: {
                    employeeId,
                    name,
                    fileUrl,
                    fileType,
                    documentType: documentType || null,
                    status: 'PENDING'
                }
            });

            return NextResponse.json(doc);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// Verify / reject an uploaded document. The verification gate is HR-only —
// managers may upload for their team but not clear the compliance check.
export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { id, decision, reviewNote } = body;

            if (!id) return createErrorResponse('Document ID required', 400);
            const normalized = String(decision || '').toLowerCase();
            if (!['verified', 'rejected', 'pending'].includes(normalized)) {
                return createErrorResponse('decision must be verified, rejected or pending', 400);
            }

            const doc = await prisma.employeeDocument.findUnique({
                where: { id },
                select: { id: true, employee: { select: { user: { select: { companyId: true } } } } }
            });
            if (!doc) return createErrorResponse('Document not found', 404);

            // Company isolation: a non-super-admin may only review their own company's docs.
            const docCompanyId = doc.employee?.user?.companyId ?? null;
            if (user.role !== 'SUPER_ADMIN' && user.companyId && docCompanyId && user.companyId !== docCompanyId) {
                return createErrorResponse('Forbidden: document belongs to another company', 403);
            }

            const status = normalized === 'verified' ? 'VERIFIED' : normalized === 'rejected' ? 'REJECTED' : 'PENDING';
            const updated = await prisma.employeeDocument.update({
                where: { id },
                data: {
                    status,
                    reviewNote: reviewNote ? String(reviewNote) : null,
                    verifiedAt: status === 'PENDING' ? null : new Date(),
                    verifiedById: status === 'PENDING' ? null : user.id,
                }
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');

            if (!id) return createErrorResponse('ID required', 400);

            await prisma.employeeDocument.delete({
                where: { id }
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
