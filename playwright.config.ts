import {defineConfig, devices} from '@playwright/test';

/**
 * Smoke tests over the real pages, in desktop and phone-sized browsers.
 * By default they build and start the site on port 3100, beside `pnpm dev`;
 * PLAYWRIGHT_BASE_URL points them at a running deployment instead.
 */
const PORT = 3100;
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
// Vercel's Deployment Protection lets automation through with this secret,
// set in GitHub Actions when previews are protected.
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    // One local retry, so a load hiccup shows as flaky in the report instead of failed.
    retries: process.env.CI ? 2 : 1,
    // Five browsers against one local server: more workers than this and pages
    // time out from load alone, not from anything the site does.
    workers: 3,
    expect: {timeout: 10_000},
    reporter: process.env.CI ? [['github'], ['html', {open: 'never'}]] : [['list'], ['html', {open: 'never'}]],
    use: {
        baseURL: externalBaseURL ?? `http://localhost:${PORT}`,
        // An English browser, so `/` negotiates to /en; tests that need Chinese set their own.
        locale: 'en-US',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        extraHTTPHeaders: bypass ? {'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true'} : undefined,
    },
    // Chromium on both sizes, plus the engines it misses: Safari's WebKit, on
    // the iPhone most visitors carry and on the desktop, and Firefox.
    projects: [
        {name: 'desktop', use: {...devices['Desktop Chrome']}},
        {name: 'mobile', use: {...devices['Pixel 7']}},
        // A page streams in hidden and is shown once the browser is ready;
        // WebKit, slowest on Windows, can take several seconds to show it.
        {name: 'iphone', use: {...devices['iPhone 15']}, expect: {timeout: 20_000}},
        {name: 'desktop-safari', use: {...devices['Desktop Safari']}, expect: {timeout: 20_000}},
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
