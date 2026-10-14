import {expect, test} from '@playwright/test';
import {groq} from './support/sanity';
import {settled} from './support/settle';

/*
  The gallery modal's finer behaviour. Engine-independent logic runs on the
  desktop Chromium project only; the long scroll would otherwise run five times.
*/

const desktopOnly = (name: string) => test.skip(name !== 'desktop', 'Same logic in every browser; run once.');

test('browser Back closes the open artwork', async ({page}) => {
    await page.goto('/en/gallery');
    await page.locator('.gallery-card').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await settled(page);

    await page.goBack();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page).not.toHaveURL(/artwork=/);
});

test('Escape closes the full-screen picture first, then the artwork', async ({page}) => {
    await page.goto('/en/gallery');
    await page.locator('.gallery-card').first().click();
    const modal = page.locator('.details-modal');
    await expect(modal).toBeVisible();
    await settled(page);

    await modal.locator('.fullscreen-thumb').click();
    const viewer = page.locator('.fullscreen-viewer');
    await expect(viewer).toBeVisible();
    await settled(page);

    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
    await expect(modal).toBeVisible();
    await settled(page);

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
});

test('each card is a link to its artwork’s own address', async ({page}) => {
    await page.goto('/en/gallery');
    const card = page.locator('.gallery-card').first();
    const slug = await card.getAttribute('data-artwork-slug');
    const link = card.locator('a.card-open');
    await expect(link).toHaveAttribute('href', `/en/gallery?artwork=${slug}`);

    // Opened on its own, as from a new tab, the address shows that artwork.
    await page.goto((await link.getAttribute('href'))!);
    await expect(page.getByRole('dialog')).toBeVisible();
});

test('every card showing English scripture links to esv.org', async ({page}) => {
    await page.goto('/en/gallery');
    await expect(page.locator('.gallery-card').first()).toBeVisible();
    // Crossway's terms: the ESV mark and a link to esv.org wherever ESV text appears.
    const missing = await page.locator('.gallery-card').evaluateAll((cards) =>
        cards
            .filter((card) => card.querySelector('.scripture.english')?.textContent?.trim())
            .filter((card) => !card.querySelector('a.esv-credit[href^="https://www.esv.org"]'))
            .map((card) => card.getAttribute('data-artwork-slug')),
    );
    expect(missing).toEqual([]);
});

test('scrolling to the end loads every artwork once', async ({page}, testInfo) => {
    desktopOnly(testInfo.project.name);
    test.setTimeout(180_000);
    await page.goto('/en/gallery');
    const cards = page.locator('.gallery-card');
    const end = page.getByText('You have reached the end of the gallery.');
    const loadMore = page.getByRole('button', {name: 'Load more artworks'});

    // Batches of 18 load on their own three at a time, then wait for "Load more".
    for (let round = 0; round < 60 && !(await end.isVisible()); round++) {
        const before = await cards.count();
        if (await loadMore.isVisible()) await loadMore.click();
        await page.mouse.wheel(0, 20_000);
        await expect.poll(async () => (await cards.count()) > before || (await end.isVisible()), {timeout: 15_000}).toBe(true);
    }
    await expect(end).toBeVisible();

    const slugs = await cards.evaluateAll((all) => all.map((card) => card.getAttribute('data-artwork-slug')));
    expect(new Set(slugs).size).toBe(slugs.length);
});

test('an old artwork link moves to the current one', async ({page}, testInfo) => {
    desktopOnly(testInfo.project.name);
    const renamed = await groq<{slug: string; old: string}[]>(
        `*[_type == "artwork" && count(previousSlugs) > 0]{"slug": slug.current, "old": previousSlugs[0]}`,
    );
    // Only one that the gallery actually shows can prove anything.
    let target: {slug: string; old: string} | undefined;
    for (const candidate of renamed) {
        await page.goto(`/en/gallery?artwork=${candidate.slug}`);
        if (await page.getByRole('dialog').isVisible({timeout: 5_000}).catch(() => false)) {
            target = candidate;
            break;
        }
    }
    test.skip(!target, 'No artwork in the gallery has had its URL changed yet.');

    await page.goto(`/en/gallery?artwork=${target!.old}`);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`[?&]artwork=${target!.slug}(&|$)`));
});

test.describe('keyboard', () => {
    test.skip(({isMobile}) => isMobile, 'Phones have no Tab key.');

    test('a card opens, pages and closes from the keyboard, and focus returns to it', async ({page, browserName}) => {
        test.skip(browserName === 'webkit', 'Safari skips links on Tab unless the visitor turns that on.');
        await page.goto('/en/gallery');
        await expect(page.locator('.gallery-card').first()).toBeVisible();

        // Tab from the top of the page to the first card.
        let onCard = false;
        for (let i = 0; i < 60 && !onCard; i++) {
            await page.keyboard.press('Tab');
            onCard = await page.evaluate(() => document.activeElement?.classList.contains('card-open') ?? false);
        }
        expect(onCard).toBe(true);

        await page.keyboard.press('Enter');
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('button', {name: 'Close'})).toBeFocused();
        await settled(page);

        const next = dialog.getByRole('button', {name: 'Next artwork'});
        if (await next.isEnabled()) {
            const before = new URL(page.url()).searchParams.get('artwork');
            await page.keyboard.press('ArrowRight');
            await expect.poll(() => new URL(page.url()).searchParams.get('artwork')).not.toBe(before);
            await settled(page);
        }
        const shown = new URL(page.url()).searchParams.get('artwork');

        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(page.locator(`[data-artwork-slug="${shown}"] .card-open`)).toBeFocused();
    });
});
