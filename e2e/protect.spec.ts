import {expect, test, type Locator} from '@playwright/test';
import {settled} from './support/settle';

/*
  The casual ways of saving an artwork are turned off: the right-click menu
  and dragging it out. A deterrent only, so the test checks just that the
  browser's own menu and drag are cancelled on each kind of artwork picture.
*/

test.skip(({isMobile}) => isMobile, 'Right-click and drag are desktop gestures; the long-press menu is CSS.');

/** Whether the browser's default for a right-click and for a drag is cancelled on this element. */
const blocked = (target: Locator) =>
    target.evaluate((el) => {
        const fire = (type: string) => !el.dispatchEvent(new MouseEvent(type, {bubbles: true, cancelable: true}));
        return {menu: fire('contextmenu'), drag: fire('dragstart')};
    });

test('gallery cards, the open artwork and full screen offer no save menu or drag', async ({page}) => {
    await page.goto('/en/gallery');
    expect(await blocked(page.locator('.gallery-card img').first())).toEqual({menu: true, drag: true});

    await page.locator('.gallery-card').first().click();
    await settled(page);
    const picture = page.locator('.details-modal .fullscreen-thumb');
    expect(await blocked(picture)).toEqual({menu: true, drag: true});

    await picture.click();
    await settled(page);
    expect(await blocked(page.locator('.fullscreen-viewer img'))).toEqual({menu: true, drag: true});
});

test('the home page’s pictures offer no save menu or drag', async ({page}) => {
    await page.goto('/en/home');
    for (const img of await page.locator('[data-protected-artwork]').all()) {
        expect(await blocked(img)).toEqual({menu: true, drag: true});
    }
    expect(await page.locator('[data-protected-artwork]').count()).toBeGreaterThan(0);
});

test('pictures that are not artworks keep the browser’s menu', async ({page}) => {
    await page.goto('/en/home');
    // The site's own ornaments and news pictures are not artworks.
    const others = page.locator('img:not([data-protected-artwork])');
    test.skip((await others.count()) === 0, 'No other pictures on the page.');
    expect((await blocked(others.first())).menu).toBe(false);
});
