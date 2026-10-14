import type {Page} from '@playwright/test';
import {expect} from '@playwright/test';

/**
 * Interface motion still playing. Ambient effects are left out: the page's
 * skylight drifts for 15 seconds after load, and a looping ornament never ends.
 */
const running = (page: Page) =>
    page.evaluate(
        () =>
            document
                .getAnimations()
                .filter((a) => {
                    const timing = a.effect?.getComputedTiming();
                    return a.playState === 'running' && timing?.iterations !== Infinity && Number(timing?.duration) <= 2000;
                })
                .length,
    );

/**
 * Waits until nothing is moving. The artwork modal flies in and slides between
 * artworks, and keys or clicks during that are dropped (Safari drops an early
 * Escape), as a visitor's would be.
 */
export async function settled(page: Page) {
    await expect.poll(() => running(page), {timeout: 10_000}).toBe(0);
}
