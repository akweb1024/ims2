import { expect, test } from '@playwright/test';
import { loginAsSuperAdmin as loginAsAdmin } from './helpers';

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
