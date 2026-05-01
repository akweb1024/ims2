import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { TokenPayload } from '@/lib/auth-legacy';
import { handleApiError, AuthorizationError, AuthenticationError } from '@/lib/error-handler';
import { getRequiredSensitiveModule, hasModuleAccess } from '@/lib/module-access';
import { prisma } from '@/lib/prisma';

type ProtectedRouteHandler = (req: NextRequest, user: TokenPayload, context?: any) => Promise<NextResponse>;

/**
 * Wrapper for API routes to handle authentication and error management consistently.
 * Now supports both NextAuth sessions and manual JWT tokens.
 * 
 * @param allowedRoles List of roles allowed to access this route. If empty, all authenticated users are allowed.
 * @param handler The actual route handler function.
 */
export const authorizedRoute = (allowedRoles: string[] = [], handler: ProtectedRouteHandler) => {
    return async (req: NextRequest, context: any) => {
        try {
            const user = await getSessionUser();

            if (!user) {
                throw new AuthenticationError('Unauthorized: Session not found');
            }

            if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
                throw new AuthorizationError('Forbidden: Insufficient permissions');
            }

            const requiredModule = getRequiredSensitiveModule(req.nextUrl.pathname);
            if (requiredModule && !hasModuleAccess(user, requiredModule)) {
                const forwardedFor = req.headers.get('x-forwarded-for');
                const ipAddress = forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'UNKNOWN';

                try {
                    await prisma.auditLog.create({
                        data: {
                            userId: user.id,
                            action: 'DENY_MODULE_ACCESS',
                            entity: 'module_access',
                            entityId: req.nextUrl.pathname,
                            ipAddress,
                            changes: {
                                method: req.method,
                                requiredModule,
                                userRole: user.role,
                                userCompanyId: user.companyId || null,
                                allowedModules: user.allowedModules || [],
                            },
                        },
                    });
                } catch (auditError) {
                    console.error('Failed to record module access denial audit log:', auditError);
                }

                throw new AuthorizationError(`Forbidden: ${requiredModule} module access is required`);
            }

            return await handler(req, user, context);
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    };
};
