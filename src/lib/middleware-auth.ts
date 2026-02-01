import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { TokenPayload } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

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
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            return await handler(req, user, context);
        } catch (error) {
            return createErrorResponse(error);
        }
    };
};
