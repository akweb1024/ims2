import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

// POST: Upload Profile Picture
export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const formData = await req.formData();
            const file = formData.get('file') as File;

            if (!file) return createErrorResponse('No file uploaded', 400);

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Ideally upload to S3/Cloudinary. For now, local public folder.
            // Format: profile-{empId}-{timestamp}.ext
            const ext = file.name.split('.').pop();
            const filename = `profile-${user.id}-${Date.now()}.${ext}`;
            const path = join(process.cwd(), 'public', 'uploads', filename);
            await mkdir(dirname(path), { recursive: true });
            await writeFile(path, buffer);

            const url = `/uploads/${filename}`;

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
