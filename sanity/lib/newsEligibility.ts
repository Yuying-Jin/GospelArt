/**
 * What the site requires of a news item before showing it: the fields the
 * Studio requires to publish, plus `showOnSite`. Checked again here because an
 * item published before a rule existed, or written through the API, can lack
 * one — the Studio's validation only blocks the Publish button.
 *
 * `lib/sanity/queries.ts` holds the app-side copy as `NEWS_ELIGIBLE` — keep
 * the two in sync.
 */
export const NEWS_ELIGIBLE_GROQ = `defined(slug.current) &&
    defined(category) &&
    defined(publishedAt) &&
    defined(title.zhTW) && title.zhTW != "" &&
    defined(title.en) && title.en != "" &&
    (count(body.zhTW) > 0 || count(body.en) > 0) &&
    (category != "event" || (defined(event.startDate) &&
        ((defined(event.name.zhTW) && event.name.zhTW != "") || (defined(event.name.en) && event.name.en != "")))) &&
    (category != "seasonal" || defined(season)) &&
    showOnSite != false`
