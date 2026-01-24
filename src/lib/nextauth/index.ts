import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./config";
import { prisma } from "@/lib/prisma";
import { verifyPassword, verifyToken } from "@/lib/auth-legacy";

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                // Add token field for impersonation
                token: { label: "Token", type: "text" }
            },
            async authorize(credentials) {
                // 1. Handle Impersonation
                if (credentials?.token) {
                    const payload = verifyToken(credentials.token as string);
                    if (payload && payload.isImpersonated) {
                        const user = await prisma.user.findUnique({
                            where: { id: payload.id },
                            include: { companies: true }
                        });

                        if (!user || user.isActive === false) return null;

                        let companyId = payload.companyId || user.companyId;
                        if (!companyId && user.companies.length === 1) {
                            companyId = user.companies[0].id;
                        }

                        return {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: user.role,
                            companyId: companyId || undefined,
                            allowedModules: (user as any).allowedModules || ['CORE']
                        };
                    }
                    return null;
                }

                // 2. Handle Standard Login
                if (!credentials?.email || !credentials?.password) return null;

                const identifier = credentials.email as string;
                const user = await prisma.user.findUnique({
                    where: { email: identifier },
                    include: { companies: true }
                });

                // REMOVED: employeeId fallback login - was causing Prisma error
                // The employeeId field doesn't have proper unique constraint in production DB
                // Users must login with email only

                if (!user || user.isActive === false) return null;

                const isValid = await verifyPassword(credentials.password as string, user.password);
                if (!isValid) return null;

                let companyId = user.companyId;
                if (!companyId && user.companies.length === 1) {
                    companyId = user.companies[0].id;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    companyId: companyId || undefined,
                    allowedModules: (user as any).allowedModules || ['CORE']
                };
            }
        })
    ],
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
});
