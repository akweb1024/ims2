import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { InstitutionType } from '@prisma/client';

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data } = await req.json();

        if (!Array.isArray(data)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        let createdCount = 0;
        let skippedCount = 0;

        for (const rawItem of data) {
            const item: any = {};
            // Better header normalization: remove special chars, space, and lowercase
            Object.keys(rawItem).forEach(key => {
                const normalizedKey = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                item[normalizedKey] = rawItem[key];
            });

            const name = (item.name || item.institutionname || item.organizationname || '').trim();
            let code = (item.code || item.shortname || item.id || '').trim();

            if (!name) {
                skippedCount++;
                continue;
            }

            // Auto-generate code if missing
            if (!code) {
                // Take first 3 letters of name + random string or timestamp part for uniqueness
                const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                const prefix = cleanName.substring(0, 4);
                const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
                code = `${prefix}-${suffix}`;
            }

            // Check if institution code already exists
            const existing = await prisma.institution.findUnique({ where: { code } });
            if (existing) {
                // If it exists, we could try to append more randomness or just skip
                // For safety in import, let's try one collision resolution if it was auto-generated
                if (!(item.code || item.shortname)) {
                    code = `${code.split('-')[0]}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                    const secondCheck = await prisma.institution.findUnique({ where: { code } });
                    if (secondCheck) {
                        skippedCount++;
                        continue;
                    }
                } else {
                    skippedCount++;
                    continue;
                }
            }

            // Normalize type
            let typeStr = (item.type || 'UNIVERSITY').toUpperCase().replace(/\s/g, '_');

            // Map common aliases
            if (typeStr === 'INSTITUTE') typeStr = 'RESEARCH_INSTITUTE';
            if (typeStr === 'GOVT') typeStr = 'GOVERNMENT';

            const type = (Object.values(InstitutionType) as string[]).includes(typeStr)
                ? (typeStr as InstitutionType)
                : InstitutionType.UNIVERSITY;

            await prisma.institution.create({
                data: {
                    name,
                    code,
                    type,
                    category: item.category,
                    primaryEmail: (item.email || item.primaryemail || item.contactemail || '').split(',')[0].trim(), // Take first email if multiple
                    primaryPhone: (item.phone || item.primaryphone || item.contactphone || '').split(',')[0].trim(), // Take first phone if multiple
                    website: item.website || item.url,
                    country: item.country || 'India',
                    state: item.state || item.province,
                    city: item.city || item.town,
                    address: item.address || item.location,
                    pincode: item.pincode || item.zipcode || item.postalcode,
                    totalStudents: item.totalstudents ? parseInt(item.totalstudents.toString().replace(/[^0-9]/g, '')) || null : null,
                    totalFaculty: item.totalfaculty ? parseInt(item.totalfaculty.toString().replace(/[^0-9]/g, '')) || null : null,
                    ipRange: item.iprange || item.ips,
                    companyId: decoded.companyId
                }
            });

            createdCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Successfully imported ${createdCount} institutions. ${skippedCount} items skipped.`
        });

    } catch (error: any) {
        console.error('Institution Import Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
