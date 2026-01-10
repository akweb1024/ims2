import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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
            const buffer = Buffer.from(bytes);

            const uploadDir = join(process.cwd(), 'public', 'uploads', 'proofs');
            await mkdir(uploadDir, { recursive: true });

            const ext = file.name.split('.').pop();
            const filename = `proof-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
            const path = join(uploadDir, filename);

            await writeFile(path, buffer);
            const url = `/uploads/proofs/${filename}`;

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
