import { defineConfig, devices } from '@playwright/test';

const port = process.env.PORT || '3000';
const baseURL = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: 'list',
    webServer: {
        command: `PORT=${port} npm run dev`,
        url: `${baseURL}/login`,
        reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
        timeout: 120000,
    },
    use: {
        baseURL,
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
