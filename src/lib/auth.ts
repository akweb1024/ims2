import { auth } from "@/lib/nextauth";
import { headers } from "next/headers";
import { verifyToken, TokenPayload } from "./auth-core";

// Re-export core utilities
export * from "./auth-core";

/**
 * Unified Session Retrieval
 * 1. Checks NextAuth Session (Modern)
 * 2. Checks Authorization Header (Legacy/API)
 */
export const getAuthenticatedUser = async (): Promise<TokenPayload | null> => {
    try {
        // 1. Try NextAuth session
        const session = await auth();
        // Note: 'auth()' might throw or return null. 

        if (session?.user) {
            return {
                id: session.user.id,
                email: session.user.email as string,
                role: session.user.role,
                companyId: session.user.companyId || undefined,
                allowedModules: (session.user as any).allowedModules,
            };
        }
    } catch (e) {
        // NextAuth check failed, continue to headers
    }

    try {
        // 2. Fallback to manual JWT in headers (API usage)
        const headersList = await headers();
        const authHeader = headersList.get("authorization");
        const token = authHeader?.split(" ")[1];

        if (token) {
            return verifyToken(token);
        }
    } catch (error) {
        console.error("Auth check failed:", error);
    }

    return null;
};

// Alias for backward compatibility if needed
export const getSessionUser = getAuthenticatedUser;
