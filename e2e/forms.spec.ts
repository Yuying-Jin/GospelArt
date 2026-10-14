import {expect, test} from '@playwright/test';

/*
  Every entry starts with `test!` (lib/testTrigger.ts), so the forms play
  their result without calling EmailOctopus or Resend.
*/

test.describe('newsletter signup', () => {
    test.beforeEach(async ({page}) => {
        await page.goto('/en/about');
    });

    const subscribe = async (page: import('@playwright/test').Page, email: string) => {
        await page.getByPlaceholder('Enter your email').fill(email);
        await page.getByRole('button', {name: 'Subscribe'}).click();
    };

    test('a signup asks for confirmation', async ({page}) => {
        await subscribe(page, 'test!');
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByRole('heading', {name: 'One more step'})).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
    });

    test('a rate limit says so', async ({page}) => {
        await subscribe(page, 'test!rate_limited');
        await expect(page.getByRole('dialog').getByRole('heading', {name: 'Please slow down'})).toBeVisible();
    });

    test('Enter in the field subscribes', async ({page}) => {
        await page.getByPlaceholder('Enter your email').fill('test!');
        await page.getByPlaceholder('Enter your email').press('Enter');
        await expect(page.getByRole('dialog').getByRole('heading', {name: 'One more step'})).toBeVisible();
    });

    test('the button is held while sending, so a second click sends nothing', async ({page}) => {
        await page.getByPlaceholder('Enter your email').fill('test!');
        const button = page.getByRole('button', {name: /Subscrib/});
        await button.click();
        await expect(button).toBeDisabled();
    });

    test('an invalid address is refused in place', async ({page}) => {
        await subscribe(page, 'not-an-address');
        await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
        await expect(page.getByRole('dialog')).toHaveCount(0);
    });
});

test.describe('contact form', () => {
    test.beforeEach(async ({page}) => {
        await page.goto('/en/contact');
        await page.locator('#name').fill('Playwright');
        await page.locator('#message').fill('A smoke test, not a real message.');
    });

    test('a message is sent and the form cleared', async ({page}) => {
        await page.locator('#email').fill('test!');
        await page.getByRole('button', {name: 'Send'}).click();
        await expect(page.getByRole('status').filter({hasText: 'Thank you for writing!'})).toBeVisible();
        await expect(page.locator('#message')).toHaveValue('');
    });

    test('a failure says to try again later', async ({page}) => {
        await page.locator('#email').fill('test!failed');
        await page.getByRole('button', {name: 'Send'}).click();
        await expect(page.getByRole('alert').filter({hasText: 'couldn’t be sent'})).toBeVisible();
    });

    test('the button is held while sending, so a second click sends nothing', async ({page}) => {
        await page.locator('#email').fill('test!');
        const button = page.getByRole('button', {name: 'Send'});
        await button.click();
        await expect(page.getByRole('button', {name: /Sending/})).toBeDisabled();
    });

    test('Enter in a field sends the form', async ({page}) => {
        await page.locator('#email').fill('test!');
        await page.locator('#name').press('Enter');
        await expect(page.getByRole('status').filter({hasText: 'Thank you for writing!'})).toBeVisible();
    });
});
