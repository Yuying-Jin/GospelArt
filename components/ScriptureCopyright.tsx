'use client'

/**
 * The full copyright notices both scripture providers require. Crossway also
 * asks for the ESV mark and an esv.org link on every page showing ESV text,
 * which `Card.tsx` and `DetailsModal.tsx` handle inline.
 *
 * Verbatim English on purpose: this is the licensors' own wording, so it is
 * not translated or routed through `next-intl`.
 */
export default function ScriptureCopyright() {
    return (
        <section className="scripture-copyright">
            <h2>Scripture Copyright · 經文版權</h2>

            <p>
                Scripture quotations marked “ESV” are from the ESV® Bible (The Holy Bible,
                English Standard Version®), © 2001 by Crossway, a publishing ministry of Good
                News Publishers. Used by permission. All rights reserved. The ESV text may not
                be quoted in any publication made available to the public by a Creative Commons
                license. Learn more at{' '}
                <a href="https://www.esv.org" target="_blank" rel="noopener noreferrer">
                    www.esv.org
                </a>
                .
            </p>

            <p>
                Chinese scripture quotations are from the Chinese Union Version (和合本, 1919),
                which is in the public domain. Traditional and Simplified Chinese text is
                retrieved via{' '}
                <a
                    href="https://www.biblesupersearch.com"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Bible SuperSearch
                </a>
                , used under its non-commercial licence.
            </p>

            <p className="note">
                This site is a non-commercial Christian ministry project. Scripture text is
                quoted in limited portions alongside each artwork and is not redistributed.
            </p>

            <style jsx>{`
              .scripture-copyright {
                max-width: 720px;
                margin: 0 auto;
                padding: 32px 20px 48px;
                color: var(--text-secondary);
                font-size: 0.9rem;
                line-height: 1.7;
              }

              h2 {
                color: var(--color-gold-secondary);
                font-size: 1.15rem;
                margin: 0 0 16px;
              }

              p {
                margin: 0 0 14px;
              }

              .note {
                opacity: 0.75;
                font-style: italic;
              }

              a {
                color: var(--color-gold-secondary);
              }
            `}</style>
        </section>
    );
}
