import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { StorageService } from '@/lib/storage';

// POST: Upload Profile Picture
export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const formData = await req.formData();
            const file = formData.get('file') as File;

            if (!file) return createErrorResponse('No file uploaded', 400);

            const bytes = await file.arrayBuffer();

            const { url } = await StorageService.saveFile(
                bytes,
                file.name,
                'profile_pictures'
            );

            // Update Profile
            await prisma.employeeProfile.update({
                where: { userId: user.id },
                data: { profilePicture: url }
            });

            return NextResponse.json({ url });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

