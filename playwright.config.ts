import {defineConfig, devices} from '@playwright/test';

/**
 * Smoke tests over the real pages, in a desktop and a phone-sized browser.
 * By default they build and start the site on port 3100, beside `pnpm dev`;
 * PLAYWRIGHT_BASE_URL points them at a running deployment instead.
 */
const PORT = 3100;
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? 'github' : [['list'], ['html', {open: 'never'}]],
    use: {
        baseURL: externalBaseURL ?? `http://localhost:${PORT}`,
        // An English browser, so `/` negotiates to /en; tests that need Chinese set their own.
        locale: 'en-US',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {name: 'desktop', use: {...devices['Desktop Chrome']}},
        {name: 'mobile', use: {...devices['Pixel 7']}},
    ],
    webServer: externalBaseURL
        ? undefined
        : {
              command: `pnpm build && pnpm start -p ${PORT}`,
              url: `http://localhost:${PORT}/en/home`,
              reuseExistingServer: !process.env.CI,
              timeout: 300_000,
          },
});
