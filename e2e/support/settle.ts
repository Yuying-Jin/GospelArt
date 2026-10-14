import type {Page} from '@playwright/test';
import {expect} from '@playwright/test';

/**
 * Interface motion still playing inside the open dialog. Only there: the page
 * behind keeps ambient effects going (the home page's beam is restyled every
 * frame, which WebKit counts as a fresh transition each time), and a looping
 * ornament never ends either.
 */
const running = (page: Page) =>
    page.evaluate(
        () =>
            document
                .getAnimations()
                .filter((a) => {
                    const timing = a.effect?.getComputedTiming();
                    const target = (a.effect as KeyframeEffect | null)?.target;
                    return (
                        a.playState === 'running' &&
                        timing?.iterations !== Infinity &&
                        Number(timing?.duration) <= 2000 &&
                        target instanceof Element &&
                        Boolean(target.closest('[role="dialog"]'))
                    );
                })
                .length,
    );

/**
 * Waits until the dialog is still. The artwork modal flies in and slides
 * between artworks, and keys or clicks during that are dropped (Safari drops
 * an early Escape), as a visitor's would be.
 */
export async function settled(page: Page) {
    await expect.poll(() => running(page), {timeout: 10_000}).toBe(0);
}
