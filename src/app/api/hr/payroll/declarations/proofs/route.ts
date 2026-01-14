import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { StorageService } from '@/lib/storage';

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const formData = await req.formData();
            const file = formData.get('file') as File;
            const category = formData.get('category') as string;
            const amount = parseFloat(formData.get('amount') as string || '0');
            const taxDeclarationId = formData.get('taxDeclarationId') as string;

            if (!file || !taxDeclarationId) {
                return createErrorResponse('File and Declaration ID required', 400);
            }

            const bytes = await file.arrayBuffer();

            const { url } = await StorageService.saveFile(
                bytes,
                file.name,
                'proofs'
            );

            const proof = await prisma.declarationProof.create({
                data: {
                    taxDeclarationId,
                    category: category || 'GENERAL',
                    amount,
                    fileName: file.name,
                    fileUrl: url,
                    status: 'PENDING'
                }
            });

            return NextResponse.json(proof);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// Admin Action on Proof
export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { id, status } = await req.json();

            if (!id || !status) return createErrorResponse('ID and Status required', 400);

            const updated = await prisma.declarationProof.update({
                where: { id },
                data: { status }
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

