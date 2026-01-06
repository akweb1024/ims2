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
}

export const generateToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
};

export const verifyToken = (token: string): TokenPayload | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (_error) {
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
        const headersList = await headers();
        const authHeader = headersList.get('authorization');
        const token = authHeader?.split(' ')[1];

        if (!token) return null;

        return verifyToken(token);
    } catch (_error) {
        return null;
    }
};
