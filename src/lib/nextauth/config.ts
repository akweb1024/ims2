import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isDashboard = nextUrl.pathname.startsWith("/dashboard");
            const isAuthPage = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register");

            if (isDashboard) {
                if (isLoggedIn) return true;
                return false; // Redirect to login
            } else if (isAuthPage) {
                if (isLoggedIn) {
                    return Response.redirect(new URL("/dashboard", nextUrl));
                }
                return true;
            }
            return true;
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id as string;
                token.role = user.role;
                token.companyId = user.companyId;
                token.allowedModules = (user as any).allowedModules || ['CORE'];
            }

            if (trigger === "update" && session) {
                if (session.companyId) token.companyId = session.companyId;
                if (session.role) token.role = session.role;
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as any;
                session.user.companyId = token.companyId as string;
                (session.user as any).allowedModules = (token as any).allowedModules || ['CORE'];
            }
            return session;
        }
    },
    providers: [], // Add providers with an empty array for now, config in auth.ts
    session: {
        strategy: "jwt",
    },
} satisfies NextAuthConfig;
