import { test, expect } from '@playwright/test';
import { chooseLoginPersona, loginAsSuperAdmin } from './helpers';

test.describe('Authentication Flow', () => {
    test('should show the persona tiles first, then the credential form', async ({ page }) => {
        await page.goto('/login');
        await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
        await expect(page.getByText('Choose how you want to sign in')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Super Admin' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Accounts' })).toBeVisible();

        await chooseLoginPersona(page, 'Super Admin');
        await expect(page.getByRole('heading', { name: 'Sign in as Super Admin' })).toBeVisible();
        await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
        await expect(page.getByPlaceholder('••••••••')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });

    test('should login successfully with valid credentials', async ({ page }) => {
        await loginAsSuperAdmin(page);
    });

    test('should show error with invalid credentials', async ({ page }) => {
        await chooseLoginPersona(page, 'Super Admin');
        await page.getByPlaceholder('you@example.com').fill('admin@stm.com');
        await page.getByPlaceholder('••••••••').fill('wrongpassword');

        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page).not.toHaveURL(/.*\/dashboard/);
        await expect(page.getByRole('button', { name: 'Sign In' })).toBeEnabled({
            timeout: 15000,
        });
        await expect(page.getByText('Invalid email or password')).toBeVisible({
            timeout: 15000,
        });
    });

    test('should reject a login through the wrong persona tile', async ({ page }) => {
        await chooseLoginPersona(page, 'HR');
        await page.getByPlaceholder('you@example.com').fill('admin@stm.com');
        await page.getByPlaceholder('••••••••').fill('password123');

        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page).not.toHaveURL(/.*\/dashboard/);
        await expect(page.getByText(/not a HR account/)).toBeVisible({ timeout: 15000 });
    });
});
