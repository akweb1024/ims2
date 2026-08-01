'use client';

import { useCallback, useEffect, useState } from 'react';
import { hasAnyRole, type RoleBearer } from '@/lib/constants/roles';

/**
 * Client-side role checks for a user who may hold more than one role.
 *
 * Dashboard screens cache the signed-in user in localStorage and gate on the single
 * `role` string from it. That predates multiple roles, so a second role opened API routes
 * and sidebar links but left every in-page button and tab hidden — the access was granted
 * on the server and then invisible in the UI.
 *
 * These read the same cached user and answer against the FULL set (primary `role` union
 * `roles[]`), matching what `authorizedRoute` does on the server.
 *
 * ## Which helper to use
 *
 * `useCan()` — for **capability** checks: "may this person do X?". Always a union, so an
 * additional role can only ever grant more.
 *
 * `usePrimaryRole()` — for **identity / audience** checks: "which kind of account is this?",
 * and for anything cosmetic (badge colour, the role shown in a header).
 *
 * The distinction matters and is not cosmetic. `role !== 'CUSTOMER'` guarding a staff-only
 * button is an audience check: run through a union it inverts, because a staff member who
 * also carries CUSTOMER would suddenly be treated as a customer and LOSE the button. Union
 * checks must only ever be used where holding the role grants something.
 */

const STORAGE_KEY = 'user';

function readStoredUser(): RoleBearer | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as RoleBearer) : null;
    } catch {
        return null;
    }
}

/** The cached signed-in user, or null before hydration / when signed out. */
export function useStoredUser(): RoleBearer | null {
    // Starts null on both server and first client render so markup matches; the effect
    // fills it in immediately after mount.
    const [user, setUser] = useState<RoleBearer | null>(null);

    useEffect(() => {
        setUser(readStoredUser());

        // Company switches and impersonation rewrite the cached user in place, and other
        // tabs can change it too. Re-read on both.
        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) setUser(readStoredUser());
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    return user;
}

/**
 * Returns a `can(allowed)` predicate: true when the user holds ANY of `allowed`.
 *
 * Use for capability gates — the direct replacement for
 * `['SUPER_ADMIN', 'ADMIN'].includes(userRole)`.
 */
export function useCan(): (allowed: readonly string[]) => boolean {
    const user = useStoredUser();
    return useCallback((allowed: readonly string[]) => hasAnyRole(user, allowed), [user]);
}

/**
 * The user's primary role only. For audience checks (CUSTOMER / AGENCY) and display.
 * Returns '' before hydration.
 */
export function usePrimaryRole(): string {
    const user = useStoredUser();
    return user?.role || '';
}
