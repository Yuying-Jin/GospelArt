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

test('the footer’s policy links open', async ({page}) => {
    await page.goto('/en/about');
    for (const href of ['/en/privacy-policy', '/en/terms-of-use']) {
        const link = page.locator(`footer a[href="${href}"]`);
        await expect(link).toHaveCount(1);
        expect((await page.request.get(href)).status()).toBe(200);
    }
});

test('the phone menu closes on a tap beside it', async ({page, isMobile}) => {
    test.skip(!isMobile, 'The menu button only shows below 1024px.');
    await page.goto('/en/home');
    const toggle = page.getByRole('button', {name: 'Toggle menu'});
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    // The scrim fills the space beside the drawer.
    const box = page.viewportSize()!;
    await page.mouse.click(box.width - 10, box.height - 10);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('the menu switches from the drawer to the bar at 1024px', async ({page}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Same CSS in every browser; run once.');
    const toggle = page.getByRole('button', {name: 'Toggle menu'});
    await page.setViewportSize({width: 1023, height: 800});
    await page.goto('/en/home');
    await expect(toggle).toBeVisible();
    await page.setViewportSize({width: 1024, height: 800});
    await expect(toggle).toBeHidden();
    await expect(page.locator('#site-menu').getByRole('link', {name: 'About'})).toBeVisible();
});

test.describe('the gallery submenu', () => {
    test.skip(({isMobile}) => isMobile, 'On phones it is part of the drawer.');

    test('opens with the arrow key, closes with Escape, and pins on click', async ({page}) => {
        await page.goto('/en/about');
        const toggle = page.locator('button.submenu-toggle');
        test.skip((await toggle.count()) === 0, 'No collections, so Gallery is a plain link.');
        const submenu = page.locator('#gallery-collections');

        await toggle.focus();
        await page.keyboard.press('ArrowDown');
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(submenu.getByRole('link').first()).toBeFocused();

        await page.keyboard.press('Escape');
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(toggle).toBeFocused();

        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(submenu.getByRole('link', {name: 'All artworks'})).toBeVisible();
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('every collection in it opens', async ({page}) => {
        await page.goto('/en/about');
        const hrefs = await page.locator('#gallery-collections a').evaluateAll((all) => all.map((a) => a.getAttribute('href')!));
        test.skip(hrefs.length === 0, 'No collections, so Gallery is a plain link.');
        for (const href of hrefs) expect((await page.request.get(href)).status(), href).toBe(200);
    });
});
