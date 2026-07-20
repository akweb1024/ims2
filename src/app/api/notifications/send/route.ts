import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { userHasCompanyAccess } from '@/lib/access-policy';
import { resolveAudience, notifyUsers, type NotificationScope } from '@/lib/notify-fanout';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

// POST /api/notifications/send — broadcast an in-app (+push) notification to
// an individual, a team (manager + downline), a whole company, or everyone.
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            const title = typeof body.title === 'string' ? body.title.trim() : '';
            const message = typeof body.message === 'string' ? body.message.trim() : '';
            const link = typeof body.link === 'string' && body.link.trim() ? body.link.trim() : null;
            if (!title || !message) return createErrorResponse('Title and message are required', 400);
            if (title.length > 200) return createErrorResponse('Title is too long (max 200 characters)', 400);
            if (message.length > 2000) return createErrorResponse('Message is too long (max 2000 characters)', 400);
            if (link && !link.startsWith('/')) return createErrorResponse('Link must be an in-app path starting with /', 400);

            let scope: NotificationScope;
            switch (body.scope) {
                case 'USERS': {
                    const userIds: string[] = Array.isArray(body.userIds) ? body.userIds.filter((v: unknown) => typeof v === 'string') : [];
                    if (!userIds.length) return createErrorResponse('At least one recipient is required', 400);
                    if (userIds.length > 200) return createErrorResponse('Too many individual recipients (max 200); use a company or team scope instead', 400);
                    if (!ADMIN_ROLES.includes(user.role)) {
                        const downline = new Set(await getDownlineUserIds(user.id, user.companyId || undefined));
                        downline.add(user.id);
                        if (userIds.some((id) => !downline.has(id))) {
                            return createErrorResponse('You can only notify members of your own team', 403);
                        }
                    }
                    scope = { kind: 'USERS', userIds };
                    break;
                }
                case 'TEAM': {
                    const managerId = typeof body.managerId === 'string' ? body.managerId : '';
                    if (!managerId) return createErrorResponse('managerId is required for a team notification', 400);
                    if (!ADMIN_ROLES.includes(user.role) && managerId !== user.id) {
                        return createErrorResponse('You can only notify your own team', 403);
                    }
                    scope = { kind: 'TEAM', managerId };
                    break;
                }
                case 'COMPANY': {
                    if (!ADMIN_ROLES.includes(user.role)) {
                        return createErrorResponse('Company-wide notifications require an admin role', 403);
                    }
                    const companyId = typeof body.companyId === 'string' ? body.companyId : '';
                    if (!companyId) return createErrorResponse('companyId is required for a company notification', 400);
                    if (user.role !== 'SUPER_ADMIN' && !(await userHasCompanyAccess(user, companyId))) {
                        return createErrorResponse('No access to that company', 403);
                    }
                    scope = { kind: 'COMPANY', companyId };
                    break;
                }
                case 'GLOBAL': {
                    if (user.role !== 'SUPER_ADMIN') {
                        return createErrorResponse('Global notifications are restricted to the super admin', 403);
                    }
                    scope = { kind: 'GLOBAL' };
                    break;
                }
                default:
                    return createErrorResponse('scope must be one of USERS, TEAM, COMPANY, GLOBAL', 400);
            }

            const recipients = await resolveAudience(scope);
            const delivered = await notifyUsers(recipients, { title, message, link });

            return NextResponse.json({ success: true, recipients: delivered });
        } catch (error: any) {
            console.error('Error sending notification broadcast:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);
