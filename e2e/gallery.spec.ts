import {expect, test} from '@playwright/test';
import {settled} from './support/settle';

/*
  Written against whatever the gallery holds, live or the fixture, so no test
  names an artwork: each takes the first card it finds.
*/

test('the gallery shows artworks', async ({page}) => {
    await page.goto('/en/gallery');
    await expect(page.locator('.gallery-card').first()).toBeVisible();
});

test('a card opens its details, and Escape closes them', async ({page}) => {
    await page.goto('/en/gallery');
    const card = page.locator('.gallery-card').first();
    const slug = await card.getAttribute('data-artwork-slug');
    await card.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`[?&]artwork=${slug}`));
    await settled(page);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page).not.toHaveURL(/artwork=/);
});

test('next moves to another artwork', async ({page}) => {
    await page.goto('/en/gallery');
    const cards = page.locator('.gallery-card');
    test.skip((await cards.count()) < 2, 'Needs two artworks.');

    await cards.first().click();
    await settled(page);
    const before = new URL(page.url()).searchParams.get('artwork');
    await page.getByRole('button', {name: 'Next artwork'}).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('artwork')).not.toBe(before);
    await expect(page.getByRole('dialog')).toBeVisible();
});

test('a shared link opens straight into the artwork', async ({page}) => {
    await page.goto('/en/gallery');
    const slug = await page.locator('.gallery-card').first().getAttribute('data-artwork-slug');

    await page.goto(`/en/gallery?artwork=${slug}`);
    await expect(page.getByRole('dialog')).toBeVisible();
});

test('an unknown collection is a 404', async ({page}) => {
    const response = await page.goto('/en/gallery/no-such-collection-e2e');
    expect(response?.status()).toBe(404);
});
