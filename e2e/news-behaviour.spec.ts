import {expect, test} from '@playwright/test';
import {groq} from './support/sanity';

const desktopOnly = (name: string) => test.skip(name !== 'desktop', 'Same logic in every browser; run once.');

test('from All News, an article’s previous and next walk every category', async ({page}) => {
    await page.goto('/en/news');
    test.skip((await page.locator('article').count()) === 0, 'Nothing published yet.');
    await page.locator('article').first().click();

    await expect(page).toHaveURL(/\?from=all$/);
    const pager = page.getByRole('navigation', {name: 'More news'});
    await expect(pager).toBeVisible();
    for (const href of await pager.getByRole('link').evaluateAll((all) => all.map((a) => a.getAttribute('href')))) {
        expect(href).toMatch(/\?from=all$/);
    }
});

test('from a category page, previous and next stay in that category', async ({page}) => {
    const segment = await groq<string | null>(
        `*[_type == "news" && defined(slug.current) && showOnSite != false] | order(publishedAt desc)[0].category`,
    );
    test.skip(!segment, 'Nothing published yet.');
    const path = {ministry: 'updates', reflection: 'reflections', event: 'events', seasonal: 'seasonal'}[segment!];

    await page.goto(`/en/news/${path}`);
    test.skip((await page.locator('article').count()) === 0, 'Nothing shown in this category.');
    await page.locator('article').first().click();

    await expect(page).not.toHaveURL(/from=all/);
    const pager = page.getByRole('navigation', {name: 'More in this category'});
    await expect(pager).toBeVisible();
    for (const href of await pager.getByRole('link').evaluateAll((all) => all.map((a) => a.getAttribute('href')))) {
        expect(href).not.toMatch(/from=all/);
    }
});

test('an old article link redirects permanently to the current one', async ({page}, testInfo) => {
    desktopOnly(testInfo.project.name);
    const renamed = await groq<{slug: string; old: string} | null>(
        `*[_type == "news" && count(previousSlugs) > 0 && showOnSite != false][0]{"slug": slug.current, "old": previousSlugs[0]}`,
    );
    test.skip(!renamed, 'No article has had its URL changed yet.');

    const response = await page.request.get(`/en/news/${renamed!.old}`, {maxRedirects: 0});
    expect(response.status()).toBe(308);
    expect(response.headers()['location']).toContain(`/en/news/${renamed!.slug}`);
});

test.describe('category filters by screen width', () => {
    // The pills that fit, from news.module.css; the rest wait under More.
    const widths = [
        {width: 600, pills: 0},
        {width: 700, pills: 1},
        {width: 900, pills: 2},
        {width: 1100, pills: 3},
    ];
    for (const {width, pills} of widths) {
        test(`${width}px shows ${pills} category pill${pills === 1 ? '' : 's'} beside All News`, async ({page}, testInfo) => {
            desktopOnly(testInfo.project.name);
            await page.setViewportSize({width, height: 900});
            await page.goto('/en/news');
            const filters = page.getByRole('navigation', {name: 'News categories'});
            // Links in the closed More panel are hidden, so only the pills count.
            const visible = filters.getByRole('link').filter({visible: true});
            await expect(visible).toHaveCount(1 + pills);
            await expect(filters.getByRole('button', {name: /More/})).toBeVisible();
        });
    }

    test('a category chosen under More names itself on the trigger', async ({page}, testInfo) => {
        desktopOnly(testInfo.project.name);
        await page.setViewportSize({width: 1100, height: 900});
        await page.goto('/en/news/seasonal');
        const trigger = page.getByRole('navigation', {name: 'News categories'}).getByRole('button', {expanded: false});
        await expect(trigger).toHaveText(/Seasonal Features/);
    });
});
