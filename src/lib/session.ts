import { auth } from "@/lib/nextauth";
import { TokenPayload, verifyToken } from "./auth-core";
import { headers } from "next/headers";

export const getSessionUser = async (): Promise<TokenPayload | null> => {
    try {
        // 1. Try NextAuth session
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

        // 2. Fallback to manual JWT in headers (Backward Compatibility)
        const headersList = await headers();
        const authHeader = headersList.get("authorization");
        const token = authHeader?.split(" ")[1];

        if (token) {
            return verifyToken(token);
        }

        return null;
    } catch (error) {
        console.error("Session Retrieval Error:", error);
        return null;
    }
};
