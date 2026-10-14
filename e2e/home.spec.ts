import {expect, test} from '@playwright/test';
import {settled} from './support/settle';

const works = (page: import('@playwright/test').Page) => page.locator('section[aria-labelledby="home-works"]');

test('the works row opens its artworks on the home page, and stays within the row', async ({page}) => {
    await page.goto('/en/home');
    const row = works(page);
    test.skip((await row.count()) === 0, 'No works row on the home page.');

    const pieces = row.locator('[data-artwork-slug]');
    const rowSlugs = await pieces.evaluateAll((all) => all.map((el) => el.getAttribute('data-artwork-slug')));
    // A click on an unlit piece only brings it to the centre, so open the lit one.
    await row.locator('[data-artwork-slug][class*="lit"]').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/en\/home\?artwork=/);
    await settled(page);

    const seen = [new URL(page.url()).searchParams.get('artwork')];
    const next = dialog.getByRole('button', {name: 'Next artwork'});
    for (let i = 0; i < rowSlugs.length && (await next.isEnabled()); i++) {
        await next.click();
        await expect.poll(() => new URL(page.url()).searchParams.get('artwork')).not.toBe(seen.at(-1));
        seen.push(new URL(page.url()).searchParams.get('artwork'));
        await settled(page);
    }
    // Next runs out at the row's last artwork, and never leaves the row.
    await expect(next).toBeDisabled();
    expect(seen.every((slug) => rowSlugs.includes(slug))).toBe(true);
});

test('the works row’s View all goes to its gallery page', async ({page}) => {
    await page.goto('/en/home');
    const row = works(page);
    test.skip((await row.count()) === 0, 'No works row on the home page.');
    const viewAll = row.getByRole('link', {name: /View all/});
    await expect(viewAll).toHaveAttribute('href', /^\/en\/gallery(\/[\w-]+)?$/);
    const response = await page.goto((await viewAll.getAttribute('href'))!);
    expect(response?.status()).toBe(200);
});

test('Latest News shows at most three articles, each of which opens', async ({page}) => {
    await page.goto('/en/home');
    const news = page.locator('section[aria-labelledby="home-news"]');
    test.skip((await news.count()) === 0, 'Nothing published yet.');

    const articles = news.locator('a[class*="tale"]');
    const hrefs = await articles.evaluateAll((all) => all.map((a) => a.getAttribute('href')!));
    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs.length).toBeLessThanOrEqual(3);
    for (const href of hrefs) {
        expect(href).toMatch(/^\/en\/news\/[^?]+\?from=all$/);
        expect((await page.request.get(href)).status()).toBe(200);
    }
});

test.describe('the ESV mark on the closing verse', () => {
    // Crossway's terms: shown with English ESV text, and only there.
    test('on English pages it links to esv.org', async ({page}) => {
        await page.goto('/en/home');
        const marks = page.locator('section[class*="closing"] a', {hasText: 'ESV'});
        for (const mark of await marks.all()) await expect(mark).toHaveAttribute('href', /^https:\/\/www\.esv\.org/);
    });

    for (const locale of ['zh-TW', 'zh-CN']) {
        test(`on ${locale} pages it is absent`, async ({page}) => {
            await page.goto(`/${locale}/home`);
            await expect(page.locator('section[class*="closing"] a', {hasText: 'ESV'})).toHaveCount(0);
        });
    }
});
