'use client';

import Link from 'next/link';
import {ChevronDown} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {navLinks} from "@/constants/nav";
import {usePathname} from "next/navigation";
import {useCallback, useEffect, useRef, useState, type KeyboardEvent} from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MaterialSymbolsPersonOutline from "@/components/svg/MaterialSymbolsPersonOutline";
import type {NavCollection} from "@/types/collection";

/**
 * Which nav entry carries the collections. The gallery is the only place a
 * collection belongs, which is structural — no collection's own name appears
 * here or anywhere else in the code.
 */
const GALLERY_KEY = 'gallery';
const SUBMENU_ID = 'gallery-collections';

export default function Navbar({collections = []}: {collections?: NavCollection[]}) {
    const t = useTranslations('menu.navigation.items');
    const tCollections = useTranslations('public.gallery.collections');

    const locale = useLocale();
    const pathname = usePathname()

    const [menuOpen, setMenuOpen] = useState(false);

    /**
     * The dropdown has two independent reasons to be open, so one flag cannot
     * express both: the pointer resting on the entry, and a click pinning it.
     * Pinned survives the pointer leaving, which is the whole point.
     */
    const [submenuPinned, setSubmenuPinned] = useState(false);
    const [submenuHovered, setSubmenuHovered] = useState(false);
    const submenuOpen = submenuPinned || submenuHovered;

    const toggleMenu = () => setMenuOpen((v) => !v);

    const closeSubmenu = useCallback(() => {
        setSubmenuPinned(false);
        setSubmenuHovered(false);
    }, []);

    /**
     * Clicking to close also drops the hover, or the dropdown would stay up
     * under the still-resting pointer and the click would look ignored. It
     * reopens once the pointer leaves and comes back.
     */
    const toggleSubmenu = () => {
        const next = !submenuPinned;
        setSubmenuPinned(next);
        if (!next) setSubmenuHovered(false);
    };

    const closeMenu = useCallback(() => {
        setMenuOpen(false);
        closeSubmenu();
    }, [closeSubmenu]);

    const navRef = useRef<HTMLElement | null>(null);
    const submenuRef = useRef<HTMLUListElement | null>(null);
    const submenuButtonRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        function handleOutsideClick(e: MouseEvent) {
            if (
                navRef.current &&
                e.target instanceof Node &&
                !navRef.current.contains(e.target)
            ) {
                setMenuOpen(false);
                setSubmenuPinned(false);
                setSubmenuHovered(false);
            }
        }
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, []);

    // Hide the nav while scrolling down; desktop only.
    useEffect(() => {
        if(window.innerWidth <= 768) return;
        let prevScrollPos = window.pageYOffset;

        const handleScroll = () => {
            const currentScrollPos = window.pageYOffset;
            const nav = navRef.current;
            if (!nav) return;

            if (prevScrollPos > currentScrollPos || document.documentElement.scrollTop < 100) {
                nav.style.top = '0';
            } else {
                nav.style.top = '-200px';
            }
            prevScrollPos = currentScrollPos;
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    },[]);

    // Hover opens the dropdown on desktop only: on a touch screen the tap that
    // opens it also fires as a click, which would close it again.
    const isPointerNav = () =>
        typeof window !== 'undefined' && window.matchMedia('(min-width: 769px)').matches;

    const submenuItems = () =>
        Array.from(submenuRef.current?.querySelectorAll('a') ?? []);

    const focusSubmenuItem = (index: number) => {
        const items = submenuItems();
        if (!items.length) return;
        items[(index + items.length) % items.length].focus();
    };

    const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Escape') {
            closeSubmenu();
            return;
        }
        if (event.key !== 'ArrowDown') return;

        event.preventDefault();
        setSubmenuPinned(true);
        // After the submenu has been painted, or there is nothing to focus.
        requestAnimationFrame(() => focusSubmenuItem(0));
    };

    const handleSubmenuKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
        if (event.key === 'Escape') {
            closeSubmenu();
            submenuButtonRef.current?.focus();
            return;
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

        event.preventDefault();
        const items = submenuItems();
        const current = items.indexOf(document.activeElement as HTMLAnchorElement);
        focusSubmenuItem(current + (event.key === 'ArrowDown' ? 1 : -1));
    };

    const galleryPath = `/${locale}/${GALLERY_KEY}`;

    return (
      <>
        <nav ref={navRef}>
            {/* Hamburger Button */}
            <button
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
                className={`hamburger ${menuOpen ? 'open' : ''}`}
                onClick={toggleMenu}
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

            <div className="nav-left" aria-hidden="true"></div>

            <ul className={menuOpen ? 'open' : ''}>
            {navLinks.navigation.map(({ key, path }) => {
                const linkPath = `/${locale}/${path}`
                const isActive = pathname.startsWith(linkPath)

                // The gallery becomes a menu once collections exist, listing
                // the whole archive first and then each collection.
                if (key === GALLERY_KEY && collections.length > 0) {
                    return (
                      <li
                        key={key}
                        className="has-submenu"
                        onMouseEnter={() => isPointerNav() && setSubmenuHovered(true)}
                        onMouseLeave={() => isPointerNav() && setSubmenuHovered(false)}
                      >
                        <button
                            ref={submenuButtonRef}
                            type="button"
                            className={`nav-item submenu-toggle ${isActive ? "active" : ""}`}
                            aria-expanded={submenuOpen}
                            aria-controls={SUBMENU_ID}
                            onClick={toggleSubmenu}
                            onKeyDown={handleButtonKeyDown}
                        >
                            <span className="label">{t(key)}</span>
                            <span className="chevron" aria-hidden="true">
                                <ChevronDown size={18} strokeWidth={1.75} />
                            </span>
                        </button>

                        <ul
                            id={SUBMENU_ID}
                            ref={submenuRef}
                            className={`submenu ${submenuOpen ? 'open' : ''}`}
                            onKeyDown={handleSubmenuKeyDown}
                        >
                            <li>
                                <Link href={linkPath} legacyBehavior>
                                    <a
                                        className={`submenu-item ${pathname === linkPath ? "active" : ""}`}
                                        onClick={closeMenu}
                                    >
                                        {tCollections('all')}
                                    </a>
                                </Link>
                            </li>
                            {collections.map(({ slug, title }) => {
                                const collectionPath = `${galleryPath}/${slug}`

                                return (
                                  <li key={slug}>
                                    <Link href={collectionPath} legacyBehavior>
                                        <a
                                            className={`submenu-item ${pathname === collectionPath ? "active" : ""}`}
                                            onClick={closeMenu}
                                        >
                                            {title}
                                        </a>
                                    </Link>
                                  </li>
                                );
                            })}
                        </ul>
                      </li>
                    );
                }

                return (
                  <li key={key}>
                    <Link href={linkPath} legacyBehavior>
                        <a className={`nav-item ${isActive ? "active" : ""}`}
                            onClick={closeMenu}>
                            <span className="label">{t(key)}</span>
                        </a>
                    </Link>
                  </li>
                );
            })}
            </ul>
            <div className="nav-right">
                <Link href={`/${locale}/auth/login`} legacyBehavior>
                    <a className={`${pathname.startsWith(`/${locale}/auth`) ? "active" : ""}`}>
                        <MaterialSymbolsPersonOutline width="2em" height="2em"/>
                        {/*<MaterialSymbolsAccountCircleFull width="1.8em" height="1.8em"/>*/}
                    </a>
                </Link>
                <LanguageSwitcher/>
            </div>
        </nav>
        <style jsx>{`
        nav {
          background: var(--color-bg-secondary);
          border-bottom: 2px solid var(--border-light);
          padding: 20px 25px 10px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 50;
          font-family: 'Noto Serif SC', 'Times New Roman', serif;
          transition: top 0.5s ease;
        }

        .nav-left {
          width: 130px;
          justify-content: flex-start;
        }

        .nav-right {
          width: 130px;
          display: flex;
          gap: 5px;
          align-items: center;
          justify-content: flex-end;
        }

        .nav-right a {
          display: flex;
          align-items: center;
          justify-content: center;
          fill: var(--text-primary);
        }

        .nav-right a:hover,
        .nav-right a.active{
          fill: var(--color-gold-secondary);
          filter: drop-shadow(0 0 4px var(--glow-gold-accent));
        }

        .user-icon  {
          width:2em;
          height:2em;
        }

        nav ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          gap: 20px;
        }

        nav li {
          position: relative;
        }

        nav a.nav-item,
        nav button.nav-item {
          color: var(--text-primary);
          text-decoration: none;
          font-size: 18px;
          letter-spacing: 2px;
          padding: 5px 10px 8px 10px;
          display: inline-block;
          position: relative;
          transition: color 0.3s ease;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        nav button.nav-item {
          background: none;
          border: none;
          font-family: inherit;
          cursor: pointer;
        }

        nav a.nav-item:hover,
        nav a.nav-item.active,
        nav button.nav-item:hover,
        nav button.nav-item.active {
          color: var(--color-gold-secondary);
          font-weight: 600;
        }

        nav a.nav-item::after,
        nav button.nav-item::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 0;
          height: 2px;
          background: linear-gradient(
                  to right,
                  rgba(230, 217, 165, 0),
                  rgba(230, 217, 165, 0.9) 50%,
                  rgba(230, 217, 165, 0)
          );
          transition: width 0.3s ease;
          transform: translateX(-50%);
        }

        nav a.nav-item:hover::after,
        nav a.nav-item.active::after,
        nav button.nav-item:hover::after,
        nav button.nav-item.active::after {
          width: 70%;
        }

        nav a.nav-item::before,
        nav button.nav-item::before {
          content: "✦";
          position: absolute;
          top: -16px;
          left: 50%;
          transform: translateX(-50%) scale(0);
          color: var(--glow-gold-accent);
          font-size: 14px;
          opacity: 0;
          transition: opacity 0.3s ease, transform 0.3s ease;
          pointer-events: none;
        }

        nav a.nav-item:hover::before,
        nav a.nav-item.active::before,
        nav button.nav-item:hover::before,
        nav button.nav-item.active::before {
          transform: translateX(-50%) scale(1);
          opacity: 1;
        }

        .chevron {
          display: none;
        }

        /* Desktop: a dropdown under the Gallery entry. */
        nav ul.submenu {
          display: block;
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          min-width: 170px;
          margin: 0;
          padding: 6px 0;
          background: var(--color-bg-secondary);
          border: 2px solid var(--border-light);
          border-radius: 0 0 8px 8px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.35);
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.25s ease;
          z-index: 60;
        }

        nav ul.submenu.open {
          opacity: 0.99;
          visibility: visible;
        }

        nav ul.submenu li {
          width: 100%;
        }

        nav a.submenu-item {
          flex: 1;
          display: block;
          padding: 8px 16px;
          color: var(--text-primary);
          font-size: 16px;
          letter-spacing: 1px;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.3s ease, color 0.3s ease;
        }

        nav a.submenu-item:hover,
        nav a.submenu-item.active {
          background: var(--color-bg-card-alt);
          color: var(--color-gold-secondary);
        }

        nav a.submenu-item:focus-visible {
          outline: 2px solid var(--color-gold-accent);
          outline-offset: -2px;
        }

        .hamburger {
          display: none;
          flex-direction: column;
          justify-content: space-around;
          width: 30px;
          height: 30px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          z-index: 999;
          transition: opacity 0.3s ease;
          color: var(--color-gold-secondary);
        }

        .hamburger span {
          width: 30px;
          height: 3px;
          background: var(--color-gold-primary);
          border-radius: 2px;
          transition: all 0.2s ease;
          transform-origin: 1px;
        }

        .hamburger.open span:nth-child(1) {
          transform: rotate(45deg);
        }

        .hamburger.open span:nth-child(2) {
          opacity: 0;
          transform: translateX(10px);
        }

        .hamburger.open span:nth-child(3) {
          transform: rotate(-45deg);
        }

        @media (max-width: 768px) {

          nav {
            padding: 15px 20px;
            justify-content: flex-start;
            position: sticky;
            top: 0;
            background: var(--color-bg-secondary);
            opacity: 0.99;
          }

          .nav-left {
            display: none;
          }

          .nav-right {
            position: absolute;
            right: 1rem;
          }

          .hamburger {
            display: flex;
          }

          nav ul {
            gap: 20px;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--color-bg-secondary);
            flex-direction: column;
            overflow: hidden;
            max-height: 0;
            opacity: 0;
            padding: 0 10px;
            border-radius: 0 0 8px 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.5);
            transition: max-height 0.35s ease, opacity 0.35s ease;
            pointer-events: none;
          }

          nav ul.open {
            max-height: 85vh;
            overflow-y: auto;
            opacity: 0.98;
            pointer-events: auto;
            padding-top: 10px;
            padding-bottom: 10px;
          }
          nav li {
            width: 100%;
            display: flex;
            justify-content: flex-start;
          }
          nav li.has-submenu {
            flex-direction: column;
            align-items: flex-start;
          }
          nav li:has(> a.nav-item.active),
          nav li:has(> button.nav-item.active) {
            background: var(--color-bg-card-alt);
          }
          nav a.nav-item,
          nav button.nav-item {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            text-align: left;
            font-size: 16px;
            padding: 8px 16px;
          }
          nav a.nav-item::after,
          nav button.nav-item::after {
            display: none;
          }
          nav .nav-item .label {
            position: relative;
            display: inline-block;
          }
          nav .nav-item .label::after {
            content: "";
            position: absolute;
            bottom: -8px;
            left: 0;
            width: 0;
            height: 2px;
            background: linear-gradient(
                    to right,
                    rgba(230, 217, 165, 0.7),
                    rgba(230, 217, 165, 0)
            );
            transition: width 0.3s ease;
          }
          nav a.nav-item:hover .label::after,
          nav a.nav-item.active .label::after,
          nav button.nav-item:hover .label::after,
          nav button.nav-item.active .label::after {
            width: 100%;
          }
          nav a.nav-item::before,
          nav button.nav-item::before {
            position: static;
            flex: 0 0 12px;
            text-align: center;
            transform: scale(0);
            font-size: 12px;
          }
          nav a.nav-item:hover::before,
          nav a.nav-item.active::before,
          nav button.nav-item:hover::before,
          nav button.nav-item.active::before {
            transform: scale(1);
          }

          .chevron {
            display: flex;
            position: absolute;
            top: 50%;
            right: 26px;
            transform: translateY(-50%);
            color: var(--color-gold-secondary);
            transition: transform 0.25s ease;
          }

          nav button.submenu-toggle[aria-expanded='true'] .chevron {
            transform: translateY(-50%) rotate(180deg);
          }

          nav ul.submenu {
            position: static;
            transform: none;
            display: flex;
            gap: 0;
            width: 100%;
            min-width: 0;
            margin: 0;
            padding: 0;
            border: none;
            border-radius: 0;
            box-shadow: none;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease, opacity 0.25s ease;
          }

          nav ul.submenu.open {
            max-height: 60vh;
            padding: 0 0 4px;
          }

          nav a.submenu-item {
            text-align: left;
            padding-left: 52px;
            font-size: 15px;
          }
        }

      `}
    </style>
      </>
    );
}
