import {defineConfig, devices} from '@playwright/test';

/**
 * Smoke tests over the real pages, in desktop and phone-sized browsers.
 * By default they build and start the site on port 3100, beside `pnpm dev`;
 * PLAYWRIGHT_BASE_URL points them at a running deployment instead.
 */
const PORT = 3100;
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    // One local retry, so a load hiccup shows as flaky in the report instead of failed.
    retries: process.env.CI ? 2 : 1,
    // Five browsers against one local server: more workers than this and pages
    // time out from load alone, not from anything the site does.
    workers: 3,
    reporter: process.env.CI ? 'github' : [['list'], ['html', {open: 'never'}]],
    use: {
        baseURL: externalBaseURL ?? `http://localhost:${PORT}`,
        // An English browser, so `/` negotiates to /en; tests that need Chinese set their own.
        locale: 'en-US',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    // Chromium on both sizes, plus the engines it misses: Safari's WebKit, on
    // the iPhone most visitors carry and on the desktop, and Firefox.
    projects: [
        {name: 'desktop', use: {...devices['Desktop Chrome']}},
        {name: 'mobile', use: {...devices['Pixel 7']}},
        {name: 'iphone', use: {...devices['iPhone 15']}},
        {name: 'desktop-safari', use: {...devices['Desktop Safari']}},
        {name: 'desktop-firefox', use: {...devices['Desktop Firefox']}},
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
