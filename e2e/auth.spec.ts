import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });

    test('should verify login page elements', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
        await expect(page.getByPlaceholder('you@example.com or EMP-001')).toBeVisible();
        await expect(page.getByPlaceholder('••••••••')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });

    test('should login successfully with valid credentials', async ({ page }) => {
        await page.getByPlaceholder('you@example.com or EMP-001').fill('admin@stm.com');
        await page.getByPlaceholder('••••••••').fill('password123');

        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect
            .poll(async () => page.url(), { timeout: 30000 })
            .toMatch(/\/dashboard/);
    });

    test('should show error with invalid credentials', async ({ page }) => {
        await page.getByPlaceholder('you@example.com or EMP-001').fill('admin@stm.com');
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
});
