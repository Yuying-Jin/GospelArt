import AxeBuilder from '@axe-core/playwright';
import {expect, test} from '@playwright/test';

/*
  axe-core checks each page against WCAG 2.1 A and AA: missing alt text and
  form labels, colour contrast, landmark and ARIA misuse. It finds what a
  machine can; keyboard flow and focus are in keyboard.spec.ts.
*/

const PAGES = ['home', 'about', 'gallery', 'news', 'contact', 'privacy-policy', 'terms-of-use'];

const scan = (page: import('@playwright/test').Page) =>
    new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

/** One line per problem, so a failure says what to fix and where. */
const describe = (violations: Awaited<ReturnType<typeof scan>>['violations']) =>
    violations.flatMap((v) => v.nodes.map((n) => `${v.impact} · ${v.id}: ${n.target.join(' ')} — ${v.help}`));

for (const path of PAGES) {
    test(`${path} has no accessibility violations`, async ({page}) => {
        await page.goto(`/en/${path}`);
        // Let the entrance animations finish, or contrast is measured mid-fade.
        await page.waitForTimeout(1500);
        const {violations} = await scan(page);
        expect(describe(violations)).toEqual([]);
    });
}

test('an open artwork has no accessibility violations', async ({page}) => {
    await page.goto('/en/gallery');
    await page.locator('.gallery-card').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForTimeout(1000);
    const {violations} = await scan(page);
    expect(describe(violations)).toEqual([]);
});
