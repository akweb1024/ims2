import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export interface TokenPayload {
    id: string;
    email: string;
    role: string;
    companyId?: string;
    isImpersonated?: boolean;
    impersonatorId?: string;
    allowedModules?: string[];
}

// Low-level JWT Verification
export const verifyToken = (token: string): TokenPayload | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
        return null;
    }
};

// Low-level JWT Generation
export const generateToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
};

// Password Hashing
export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 10);
};

// Password Verification
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
};
