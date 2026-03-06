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
            const userRole = (auth?.user as any)?.role;
            const companyId = (auth?.user as any)?.companyId;
            const isStaff = isLoggedIn && !['CUSTOMER', 'AGENCY'].includes(userRole);
            const hasCompany = !!companyId || userRole === 'SUPER_ADMIN';

            if (isAuthPage) {
                if (isLoggedIn) {
                    const destination = (isStaff && hasCompany) ? "/dashboard/staff-portal" : "/dashboard";
                    return Response.redirect(new URL(destination, nextUrl));
                }
                return true;
            }

            if (isDashboard) {
                if (!isLoggedIn) return false; // Redirect to login

                // If accessing dashboard root, redirect staff to staff portal if they have a company
                if (nextUrl.pathname === "/dashboard" && isStaff && hasCompany) {
                    return Response.redirect(new URL("/dashboard/staff-portal", nextUrl));
                }

                // Route guards for specific dashboard paths
                if (nextUrl.pathname.startsWith("/dashboard/staff-portal")) {
                    if (!isStaff) {
                        // Redirect non-staff away from staff portal to their appropriate dashboard
                        return Response.redirect(new URL("/dashboard", nextUrl));
                    }
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
                if (session.companyId !== undefined) token.companyId = session.companyId;
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
