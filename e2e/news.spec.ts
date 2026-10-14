import {expect, test} from '@playwright/test';

test('the news list opens, and an article from it', async ({page}) => {
    await page.goto('/en/news');
    await expect(page.getByRole('heading', {level: 1, name: 'News'})).toBeVisible();

    const titles = page.locator('article h2 a');
    test.skip((await titles.count()) === 0, 'Nothing published yet.');

    // The title link is covered by the card's stretched link, which is what a visitor clicks.
    const title = (await titles.first().innerText()).trim();
    await page.locator('article').first().click();
    await expect(page.getByRole('heading', {level: 1})).toHaveText(title);
});

test('the category filters are links to their pages', async ({page}) => {
    await page.goto('/en/news');
    const filters = page.getByRole('navigation', {name: 'News categories'});
    await expect(filters.getByRole('link', {name: 'All News'})).toHaveAttribute('aria-current', 'page');
});

test('an unknown article is a 404', async ({page}) => {
    const response = await page.goto('/en/news/no-such-article-e2e');
    expect(response?.status()).toBe(404);
});
