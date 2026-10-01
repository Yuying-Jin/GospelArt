'use client';
import {usePathname, useRouter} from '@/i18n/navigation';
import {routing} from '@/i18n/routing';
import {useLocale} from 'next-intl';
import {useEffect, useState} from "react";

type AppLocale = (typeof routing.locales)[number];

export default function LanguageSwitcher() {
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => setMenuOpen((v) => !v);

    const closeMenu = () => setMenuOpen(false);

    /*
      Going through next-intl's router rather than rewriting the path's first
      segment is what writes NEXT_LOCALE. The middleware reads that cookie
      ahead of Accept-Language, so a deliberate choice outlives the visit
      instead of being overruled by the browser's language on the way back.
    */
    const changeLocale = (newLocale: AppLocale) => {
        router.replace(pathname, {locale: newLocale});
        toggleMenu();
    };

    useEffect(() => {
        function handleOutsideClick(e: MouseEvent) {
            if (menuOpen) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [menuOpen]);

    const locales: {key: AppLocale; label: string}[] = [
        { key: 'zh-CN', label: '简体中文' },
        { key: 'zh-TW', label: '繁體中文' },
        { key: 'en', label: 'English' },
    ];


    return (
        <div className="language-switcher">
            <button onClick={() => setMenuOpen(!menuOpen)}>
                {locales.find(l => l.key === locale)?.label || 'Language'}
            </button>
            {/* Always rendered, so closing can shrink it back into the button. */}
            <ul className={menuOpen ? 'open' : ''} aria-hidden={!menuOpen}>
                {
                    locales.map(l => (
                    <li className={locale == l.key ? "active" : ""} key={l.key} onClick={() => changeLocale(l.key)}>
                        {l.label}
                    </li>
                ))}
            </ul>
            <style jsx>{`
              /* relative, so the menu below anchors to this button. Without it
                 the nearest positioned ancestor is the sticky <nav> and right: 0
                 lines the menu up with the page edge instead. */
              .language-switcher {
                position: relative;
                z-index: 100;
                font-family: var(--font-body);
              }

              /* Fixed box, because the label is the thing that changes: a CJK
                 line box is taller than a Latin one, so without a height this
                 button measured 20px in English and 34px in Simplified. The
                 min-width holds the widest label, so the icon beside it stops
                 sliding 29px sideways when the language changes. */
              .language-switcher > button {
                background: var(--color-bg-secondary);
                color: var(--text-primary);
                border: 2px solid var(--border-light);
                border-radius: 6px;
                height: 36px;
                min-width: 88px;
                padding: 0 10px;
                line-height: 1;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
              }

              .language-switcher > button:hover {
                background: var(--color-bg-card-alt);
                color: var(--color-gold-secondary);
              }

              .language-switcher ul {
                margin: 5px 0 0 0;
                padding: 0;
                list-style: none;
                background: var(--color-bg-secondary);
                border: 2px solid var(--border-light);
                border-radius: 6px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                position: absolute;
                right: 0;
                min-width: 140px;
                overflow: hidden;
                z-index: 100;
                /* Grows out of the button above its right edge and shrinks back
                   into it; the button is at least 88px wide. */
                transform-origin: calc(100% - 44px) top;
                transform: scale(0.5);
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.18s ease 0.04s, transform 0.22s cubic-bezier(0.55, 0, 0.75, 0.3), visibility 0s linear 0.22s;
              }

              .language-switcher ul.open {
                transform: none;
                opacity: 1;
                visibility: visible;
                transition: opacity 0.18s ease, transform 0.26s cubic-bezier(0.22, 0.61, 0.36, 1), visibility 0s;
              }

              .language-switcher li {
                padding: 8px 12px;
                cursor: pointer;
                transition: background 0.3s ease, color 0.3s ease;
              }

              .language-switcher li:hover {
                background: var(--color-bg-card-alt);
                color: var(--color-gold-secondary);
              }

              .language-switcher li.active {
                background: var(--color-bg-card-alt);
                color: var(--color-gold-secondary);
              }

              @media (min-width: 768px) {
                .language-switcher > button:hover {
                  background: var(--color-bg-secondary);
                  color: white;
                }
              }

              @media (prefers-reduced-motion: reduce) {
                .language-switcher > button,
                .language-switcher li,
                .language-switcher ul,
                .language-switcher ul.open {
                  transition: none;
                }
              }
            `}</style>
        </div>
    );
}