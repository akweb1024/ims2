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
    // 1. Try NextAuth session
    try {
        const session = await auth();
        if (session?.user) {
            return {
                id: session.user.id,
                email: session.user.email as string,
                role: session.user.role,
                companyId: session.user.companyId || undefined,
                allowedModules: (session.user as any).allowedModules,
            };
        }
    } catch (e: any) {
        console.error("[Auth] NextAuth session check failed:", e?.message || e);
    }

    // 2. Fallback to manual JWT in headers (API usage)
    try {
        const headersList = await headers();
        const authHeader = headersList.get("authorization");
        const token = authHeader?.split(" ")[1];

        if (token) {
            const payload = verifyToken(token);
            if (payload) return payload;
            console.warn("[Auth] JWT token present but verification failed");
        }
    } catch (error: any) {
        console.error("[Auth] Header/JWT check failed:", error?.message || error);
    }

    return null;
};

// Alias for backward compatibility if needed
export const getSessionUser = getAuthenticatedUser;
