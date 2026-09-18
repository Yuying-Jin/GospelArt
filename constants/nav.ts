/**
 * The two groups have different owners, which is why they are separate.
 * `navigation` is the navbar's and is deliberately not repeated in the footer:
 * the navbar is on every page, so a second copy earned nothing. `policy` is the
 * footer's and appears nowhere else — it is the only route to the terms page.
 */
export const navLinks = {
    navigation: [
        { key: 'home', path: 'home' },
        { key: 'about', path: 'about' },
        { key: 'gallery', path: 'gallery' },
        { key: 'news', path: 'news' },
        { key: 'witness', path: 'witness' },
        { key: 'contact', path: 'contact' }
    ],
    policy: [
        { key: 'privacy', path: 'privacy-policy' },
        { key: 'terms', path: 'terms-of-use' }
    ]
};
