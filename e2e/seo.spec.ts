import {expect, test} from '@playwright/test';

/* Same in every browser: served text, not a page. */
test.skip(({browserName, isMobile}) => browserName !== 'chromium' || isMobile, 'Run once, in desktop Chromium.');

test('the sitemap is well-formed XML listing each page with its other languages', async ({page, request}) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();

    // A stray & or < anywhere makes search engines reject the whole file.
    const problem = await page.evaluate((text) => {
        const doc = new DOMParser().parseFromString(text, 'application/xml');
        return doc.querySelector('parsererror')?.textContent ?? null;
    }, xml);
    expect(problem).toBeNull();

    expect(xml).toMatch(/<loc>https?:\/\/[^<]+\/en\/home<\/loc>/);
    expect(xml).toMatch(/hreflang="zh-TW" href="https?:\/\/[^"]+\/zh-TW\/home"/);
    expect(xml).toMatch(/hreflang="x-default"/);
    // Pages that are not ready yet stay out.
    expect(xml).not.toMatch(/\/(about|privacy-policy|witness|auth)\b/);
});

test('robots.txt points to the sitemap, or closes a preview entirely', async ({request}) => {
    const text = await (await request.get('/robots.txt')).text();
    const production = /Sitemap: https?:\/\/\S+\/sitemap\.xml/.test(text);
    if (production) {
        expect(text).toMatch(/Disallow: \/api\//);
        expect(text).toMatch(/Disallow: \/\*\/auth\//);
    } else {
        expect(text).toMatch(/Disallow: \/\s*$/m);
    }
});
