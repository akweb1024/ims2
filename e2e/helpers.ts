import { expect, type Page } from '@playwright/test';

/**
 * The login page opens on the "Sign in as…" persona tiles; the credential
 * form only renders after a tile is chosen. Clicking is retried because only
 * hydrated React can switch screens — a click that lands before hydration is
 * silently lost.
 */
export async function chooseLoginPersona(page: Page, persona: string) {
    await page.goto('/login');
    await expect(async () => {
        await page.getByRole('button', { name: persona }).click();
        await expect(page.getByPlaceholder('you@example.com')).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 20000 });
}

export async function loginAsSuperAdmin(page: Page) {
    await chooseLoginPersona(page, 'Super Admin');
    await page.getByPlaceholder('you@example.com').fill('admin@stm.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect.poll(async () => page.url(), { timeout: 30000 }).toMatch(/\/dashboard/);
}
