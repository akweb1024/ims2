import bcrypt from 'bcryptjs';
import { TokenPayload, generateToken as coreGenerateToken, verifyToken as coreVerifyToken } from './auth-core';
import { getSessionUser } from './session';

export type { TokenPayload };

export const generateToken = (payload: TokenPayload): string => {
    return coreGenerateToken(payload);
};

export const verifyToken = (token: string): TokenPayload | null => {
    return coreVerifyToken(token);
};

export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 10);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
};

export const getAuthenticatedUser = async (): Promise<TokenPayload | null> => {
    return getSessionUser();
};
