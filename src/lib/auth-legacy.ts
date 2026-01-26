// Re-export unified auth logic
export * from './auth';
export { getAuthenticatedUser } from './auth';

// Backward compatibility aliases if needed (though * exports most)
import { generateToken as gt, verifyToken as vt, hashPassword as hp, verifyPassword as vp } from './auth-core';
export const generateToken = gt;
export const verifyToken = vt;
export const hashPassword = hp;
export const verifyPassword = vp;
