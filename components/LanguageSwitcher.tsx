'use client';
import { useRouter, usePathname } from 'next/navigation';
import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useState} from "react";

export default function LanguageSwitcher() {
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => setMenuOpen((v) => !v);

    const closeMenu = () => setMenuOpen(false);

    const changeLocale = (newLocale: string) => {
        const segments = pathname.split('/');
        segments[1] = newLocale;
        const newPath = segments.join('/');
        router.push(newPath);
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

    const locales = [
        { key: 'zh-CN', label: '简体中文' },
        { key: 'zh-TW', label: '繁體中文' },
        { key: 'en', label: 'English' },
    ];


    return (
        <div className="language-switcher">
            <button onClick={() => setMenuOpen(!menuOpen)}>
                {locales.find(l => l.key === locale)?.label || 'Language'}
            </button>
            {menuOpen && (
                <ul>
                    {
                        locales.map(l => (
                        <li className={locale == l.key ? "active" : ""} key={l.key} onClick={() => changeLocale(l.key)}>
                            {l.label}
                        </li>
                    ))}
                </ul>
            )}
            <style jsx>{`
              .language-switcher {
                z-index: 100;
                font-family: 'Noto Serif SC', 'Times New Roman', serif;
              }

              .language-switcher > button {
                background: var(--color-bg-secondary);
                color: var(--text-primary);
                border: 2px solid var(--border-light);
                padding: 5px 12px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
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

              /* --- 响应式调整 --- */
              @media (max-width: 768px) {

                .language-switcher > button {
                  padding: 5px 8px;
                }

                .language-switcher > button:hover {
                  background: var(--color-bg-secondary);
                  color: white;
                }

                
                
              }
            `}</style>
        </div>
    );
}