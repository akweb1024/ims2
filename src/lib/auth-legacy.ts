import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export interface TokenPayload {
    id: string;
    email: string;
    role: string;
    companyId?: string;
    isImpersonated?: boolean;
    impersonatorId?: string;
    allowedModules?: string[];
}

export const generateToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
};

export const verifyToken = (token: string): TokenPayload | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
        return null;
    }
};

export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 10);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
};

// Helper for server components/API routes
import { headers } from 'next/headers';

export const getAuthenticatedUser = async (): Promise<TokenPayload | null> => {
    try {
        // 1. Try NextAuth Session (Dynamic import to avoid circular dependency)
        // This is crucial for fixing "Unable to create company" errors where cookies are used instead of Bearer tokens
        const { auth } = await import('@/lib/nextauth');
        const session = await auth();

        if (session?.user) {
            return {
                id: session.user.id,
                email: session.user.email!,
                role: session.user.role,
                companyId: session.user.companyId || undefined,
                allowedModules: (session.user as any).allowedModules,
                // Add any other mapped fields if necessary
            };
        }

        // 2. Fallback to Legacy Header
        const headersList = await headers();
        const authHeader = headersList.get('authorization');
        const token = authHeader?.split(' ')[1];

        if (!token) return null;

        return verifyToken(token);
    } catch (error) {
        console.error("Auth Verification Error:", error);
        return null;
    }
};
