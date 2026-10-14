import {expect, test} from '@playwright/test';

test.describe('locale negotiation', () => {
    test('an English browser lands on the English home page', async ({page}) => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/en\/home$/);
        await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    });

    test.describe('a Traditional Chinese browser', () => {
        test.use({locale: 'zh-TW'});

        test('lands on the Traditional Chinese home page', async ({page}) => {
            await page.goto('/');
            await expect(page).toHaveURL(/\/zh-TW\/home$/);
        });
    });
});

test.describe('every page in the menus opens', () => {
    for (const path of ['home', 'about', 'gallery', 'news', 'contact']) {
        test(path, async ({page}) => {
            const response = await page.goto(`/en/${path}`);
            expect(response?.status()).toBe(200);
            await expect(page.getByRole('heading', {level: 1}).first()).toBeVisible();
        });
    }

    // Neither has a heading of its own yet, so only the response is checked.
    for (const path of ['privacy-policy', 'terms-of-use']) {
        test(path, async ({page}) => {
            const response = await page.goto(`/en/${path}`);
            expect(response?.status()).toBe(200);
        });
    }
});

test('a chosen language is remembered over the browser’s', async ({page}) => {
    await page.goto('/en/about');
    await page.locator('.language-switcher > button').click();
    await page.locator('.language-switcher li', {hasText: '繁體中文'}).click();
    await expect(page).toHaveURL(/\/zh-TW\/about$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');

    // The browser still asks for English; the NEXT_LOCALE cookie wins.
    await page.goto('/');
    await expect(page).toHaveURL(/\/zh-TW\/home$/);
});

test('the language menu lists Traditional Chinese first', async ({page}) => {
    await page.goto('/en/about');
    await expect(page.locator('.language-switcher li')).toHaveText(['繁體中文', '简体中文', 'English']);
});

test('the phone menu opens and navigates', async ({page, isMobile}) => {
    test.skip(!isMobile, 'The menu button only shows below 1024px.');
    await page.goto('/en/home');
    await page.getByRole('button', {name: 'Toggle menu'}).click();
    await page.locator('#site-menu').getByRole('link', {name: 'About'}).click();
    await expect(page).toHaveURL(/\/en\/about$/);
});
