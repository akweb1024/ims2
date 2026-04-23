import { expect, test } from '@playwright/test';

const loginAsAdmin = async (page: import('@playwright/test').Page) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com or EMP-001').fill('admin@stm.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect
        .poll(async () => page.url(), { timeout: 30000 })
        .toMatch(/\/dashboard/);
};

test.describe('Razorpay Analytics', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('should render the Razorpay analytics page with server-side sync status', async ({ page }) => {
        await page.goto('/dashboard/analytics/razorpay');

        await expect(page.getByRole('heading', { name: /Razorpay Analytics/i })).toBeVisible();
        await expect(page.getByText(/Server Auto-Sync/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /Sync Now/i })).toBeVisible();
    });
});
