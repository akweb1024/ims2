import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin } from './helpers';

test.describe('Dashboard live smoke verification', () => {
  test('Recruitment + CRM Insights + Super Admin stats should match live APIs', async ({ page }) => {
    await loginAsSuperAdmin(page);

    // Recruitment
    await page.goto('/dashboard/recruitment');
    await expect(page.getByRole('heading', { name: 'Recruitment Hub' })).toBeVisible();

    const recruitmentApi = await page.evaluate(async () => {
      const [jobsRes, applicationsRes] = await Promise.all([
        fetch('/api/recruitment/jobs'),
        fetch('/api/recruitment/applications'),
      ]);
      const jobs = jobsRes.ok ? await jobsRes.json() : [];
      const applications = applicationsRes.ok ? await applicationsRes.json() : [];
      return {
        jobsCount: Array.isArray(jobs) ? jobs.length : 0,
        applicationsCount: Array.isArray(applications) ? applications.length : 0,
      };
    });

    await expect(page.getByText(new RegExp(`Manage open positions \\(${recruitmentApi.jobsCount}\\)`))).toBeVisible();
    if (recruitmentApi.applicationsCount === 0) {
      await expect(page.getByText('No active applications.')).toBeVisible();
    }

    // CRM Insights
    await page.goto('/dashboard/crm/insights');
    await expect(page.getByRole('heading', { name: 'CRM Insights' })).toBeVisible();

    const crmApi = await page.evaluate(async () => {
      const [inds, insts, ags, subs] = await Promise.all([
        fetch('/api/customers?limit=1&type=INDIVIDUAL').then((r) => r.json()),
        fetch('/api/customers?limit=1&type=INSTITUTION').then((r) => r.json()),
        fetch('/api/customers?limit=1&type=AGENCY').then((r) => r.json()),
        fetch('/api/subscriptions?limit=1&status=ACTIVE').then((r) => r.json()),
      ]);
      return {
        customers: inds?.pagination?.total || 0,
        institutions: insts?.pagination?.total || 0,
        agencies: ags?.pagination?.total || 0,
        subscriptions: subs?.pagination?.total || 0,
      };
    });

    await expect(page.locator('p', { hasText: 'Individuals' }).locator('xpath=following-sibling::p[1]')).toHaveText(String(crmApi.customers));
    await expect(page.locator('p', { hasText: 'Institutions' }).locator('xpath=following-sibling::p[1]')).toHaveText(String(crmApi.institutions));
    await expect(page.locator('p', { hasText: 'Agencies' }).locator('xpath=following-sibling::p[1]')).toHaveText(String(crmApi.agencies));
    await expect(page.locator('p', { hasText: 'Active Subscriptions' }).locator('xpath=following-sibling::p[1]')).toHaveText(String(crmApi.subscriptions));

    // Super Admin
    await page.goto('/dashboard/super-admin');
    await expect(page.getByRole('heading', { name: 'Enterprise Command' })).toBeVisible();

    // The dashboard defaults to the 6-month ("6M") reporting window on load.
    const superAdminApi = await page.evaluate(async () => {
      const res = await fetch('/api/super-admin/dashboard-stats?period=6');
      if (!res.ok) return null;
      return res.json();
    });
    expect(superAdminApi).not.toBeNull();

    const globalWorkforce = superAdminApi?.kpis?.workforce?.current ?? 0;
    await expect(
      page.locator('p', { hasText: 'Global Workforce' }).locator('xpath=following-sibling::h2[1]'),
    ).toHaveText(String(globalWorkforce));
  });
});

