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
 * collection belongs, which is structural — no collection's name appears
 * here or anywhere else in the code.
 */
const DESKTOP_MIN_WIDTH = 1024;

const GALLERY_KEY = 'gallery';
const SUBMENU_ID = 'gallery-collections';
const MENU_ID = 'site-menu';

// English in every locale until the ministry settles its Chinese name.
const SITE_NAME = 'St. John’s Gospel Arts';

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

    const galleryPath = `/${locale}/${GALLERY_KEY}`;

    // The home page lays the nav over its hero and names the site there instead.
    const isHome = pathname === `/${locale}/home`;
    const isAuthPage = pathname.startsWith(`/${locale}/auth`);

    // Opening the menu from a gallery page opens the collections with it.
    const toggleMenu = () => {
        const next = !menuOpen;
        // Pinned where it was tapped, so it stays over the drawer even where the
        // nav scrolls with the page (the home page lays it over the hero).
        const button = hamburgerRef.current;
        if (next && button) {
            const {top, left} = button.getBoundingClientRect();
            button.style.setProperty('--pinned-top', `${Math.max(top, 0)}px`);
            button.style.setProperty('--pinned-left', `${left}px`);
        }
        setMenuOpen(next);
        setSubmenuPinned(next && pathname.startsWith(galleryPath));
        setSubmenuHovered(false);
    };

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
    const hamburgerRef = useRef<HTMLButtonElement | null>(null);
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

    // The drawer covers the page, so the page stops scrolling under it and Escape closes it.
    useEffect(() => {
        if (!menuOpen) return;
        // Both elements: mobile Safari keeps scrolling when only body is locked.
        const root = document.documentElement;
        const {overflow} = document.body.style;
        const rootOverflow = root.style.overflow;
        document.body.style.overflow = 'hidden';
        root.style.overflow = 'hidden';
        const handleKey = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape') closeMenu();
        };
        document.addEventListener('keydown', handleKey);
        return () => {
            document.body.style.overflow = overflow;
            root.style.overflow = rootOverflow;
            document.removeEventListener('keydown', handleKey);
        };
    }, [menuOpen, closeMenu]);

    // Hide the nav while scrolling down; desktop only.
    useEffect(() => {
        if (window.innerWidth < DESKTOP_MIN_WIDTH) return;
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
        typeof window !== 'undefined' &&
        window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`).matches;

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

    return (
      <>
        <nav ref={navRef} className={`${isHome ? 'home' : ''} ${menuOpen ? 'menu-open' : ''}`}>
            {/* The crystal fill shared by the hamburger's lines and the account icon. */}
            <svg className="defs" width="0" height="0" aria-hidden="true" focusable="false">
                <defs>
                    <linearGradient id="nav-crystal" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#ffffff"/>
                        <stop offset="0.3" stopColor="#e4ecf8"/>
                        <stop offset="0.48" stopColor="#ffffff"/>
                        <stop offset="0.72" stopColor="#bfcde3"/>
                        <stop offset="1" stopColor="#f6f9ff"/>
                    </linearGradient>
                    <linearGradient id="nav-crystal-gold" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#fff8dc"/>
                        <stop offset="0.3" stopColor="#ffe687"/>
                        <stop offset="0.48" stopColor="#fff4c4"/>
                        <stop offset="0.72" stopColor="#d9b54a"/>
                        <stop offset="1" stopColor="#ffeaa3"/>
                    </linearGradient>
                </defs>
            </svg>

            {/* Turns into the close button and stays above the drawer it opens. */}
            <button
                ref={hamburgerRef}
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
                aria-controls={MENU_ID}
                className={`hamburger ${menuOpen ? 'open' : ''}`}
                onClick={toggleMenu}
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

            {/* Empty: it balances .nav-right so the links stay centred. */}
            <div className="nav-left" aria-hidden="true"></div>

            <div className={`scrim ${menuOpen ? 'open' : ''}`} onClick={closeMenu} aria-hidden="true"></div>

            <ul id={MENU_ID} className={menuOpen ? 'open' : ''}>
            {navLinks.navigation.map(({ key, path }) => {
                const linkPath = `/${locale}/${path}`
                const isActive = pathname.startsWith(linkPath)

                // The gallery becomes a menu once collections exist, listing
                // each collection and then the whole archive.
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
                            {/* Last: the collections are the curated way in, the archive the fallback. */}
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
                {/* On a phone the drawer is the only place the site is named. */}
                <li className="drawer-name" aria-hidden="true">{SITE_NAME}</li>
            </ul>
            <div className="nav-right">
                <Link href={`/${locale}/auth/login`} legacyBehavior>
                    <a className={`auth ${isAuthPage ? "active" : ""}`}>
                        <MaterialSymbolsPersonOutline width="1.7em" height="1.7em"
                            fill={isAuthPage ? "url(#nav-crystal-gold)" : "url(#nav-crystal)"}/>
                    </a>
                </Link>
                <LanguageSwitcher/>
            </div>
        </nav>
        <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          nav ul,
          nav ul.open,
          nav ul.submenu,
          nav ul.submenu.open {
            transition: none !important;
          }
        }

        nav {
          background: var(--color-bg-secondary);
          border-bottom: 2px solid var(--border-light);
          /* The same on every page, so the links do not move between them. Sides
             inset to a 1200px column on wide screens, back to 24px by 1024. */
          padding: 22px clamp(24px, calc((100vw - 1200px) / 2 + 36px), 160px) 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 50;
          /* The design's stack, by name: Noto Serif in every locale, English included. */
          font-family: "Noto Serif TC", "Songti TC", "PMingLiU", serif;
          transition: top 0.5s ease;
        }

        .defs {
          position: absolute;
        }

        /* Equal shares either side are what centre the menu between them. */
        .nav-left,
        .nav-right {
          flex: 1 1 0;
          min-width: 0;
          display: flex;
          align-items: center;
        }

        .nav-right {
          gap: 12px;
          justify-content: flex-end;
        }

        /* The icon takes the crystal fill; hover and the auth pages warm its glow. */
        .nav-right a.auth {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 36px;
          filter: drop-shadow(0 0 5px rgba(230, 240, 255, 0.55)) drop-shadow(0 1px 3px rgba(9, 9, 14, 0.7));
          transition: filter 0.3s ease;
        }

        .nav-right a.auth:hover,
        .nav-right a.auth.active {
          filter: drop-shadow(0 0 6px var(--glow-gold-accent)) drop-shadow(0 1px 3px rgba(9, 9, 14, 0.7));
        }

        /* Its own layer, so Windows draws the labels with greyscale smoothing as the
           design does; ClearType's colour fringes make them look thinner and smaller. */
        nav ul {
          will-change: transform;
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          gap: 6px;
        }

        nav li {
          position: relative;
        }

        /* Warm off-white with a soft dark halo, as in the design, on every page. */
        nav a.nav-item,
        nav button.nav-item {
          color: #f3efe4;
          text-shadow: 0 1px 10px rgba(9, 9, 14, 0.9);
          text-decoration: none;
          font-size: 16px;
          letter-spacing: 2px;
          padding: 5px 10px 8px 10px;
          display: inline-block;
          position: relative;
          transition: color 0.3s ease;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        :global(html[lang='zh-CN']) nav {
          font-family: "Noto Serif SC", "Songti SC", "SimSun", serif;
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

        /* Desktop: a dropdown under the Gallery entry, growing out of it and
           shrinking back into it. */
        nav ul.submenu {
          display: block;
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%) scale(0.5);
          transform-origin: top center;
          min-width: 170px;
          margin: 0;
          padding: 6px 0;
          background: var(--color-bg-secondary);
          border: 2px solid var(--border-light);
          border-radius: 0 0 8px 8px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.35);
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.18s ease 0.04s, transform 0.22s cubic-bezier(0.55, 0, 0.75, 0.3), visibility 0s linear 0.22s;
          z-index: 60;
        }

        nav ul.submenu.open {
          opacity: 0.99;
          visibility: visible;
          transform: translateX(-50%) scale(1);
          transition: opacity 0.18s ease, transform 0.26s cubic-bezier(0.22, 0.61, 0.36, 1), visibility 0s;
        }

        nav ul.submenu li {
          width: 100%;
        }

        nav a.submenu-item {
          flex: 1;
          display: block;
          padding: 8px 16px;
          color: #f3efe4;
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

        /* White crystal lines: a glinting gradient and a soft white halo. */
        .hamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          gap: 5px;
          width: 32px;
          height: 32px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          position: relative;
          z-index: 3;
          filter: drop-shadow(0 0 5px rgba(230, 240, 255, 0.55));
        }

        .hamburger span {
          width: 24px;
          height: 2.5px;
          border-radius: 2px;
          background: linear-gradient(90deg, #ffffff 0%, #e4ecf8 30%, #ffffff 46%, #bfcde3 70%, #f6f9ff 100%);
          box-shadow: inset 0 -0.5px 0 rgba(120, 140, 170, 0.45);
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        .hamburger span:nth-child(2) {
          width: 18px;
        }

        /* 7.5px is one line plus the gap, so the outer two cross at the centre. */
        .hamburger.open span:nth-child(1) {
          transform: translateY(7.5px) rotate(45deg);
        }

        .hamburger.open span:nth-child(2) {
          opacity: 0;
          transform: translateX(-8px);
        }

        .hamburger.open span:nth-child(3) {
          transform: translateY(-7.5px) rotate(-45deg);
        }

        .scrim,
        .drawer-name {
          display: none;
        }

        /* Home: laid over the hero, with no bar of its own. */
        nav.home {
          position: absolute;
          left: 0;
          right: 0;
          background: linear-gradient(180deg, rgba(9, 9, 14, 0.85), transparent);
          border-bottom: none;
        }

        @media (max-width: ${DESKTOP_MIN_WIDTH - 1}px) {

          nav {
            padding: 15px 20px;
            justify-content: flex-start;
            position: sticky;
            top: 0;
            background: var(--color-bg-secondary);
            opacity: 0.99;
          }

          /* Holds the bar's height for when the open hamburger is pinned out of the flow. */
          .nav-left {
            display: block;
            flex: none;
            width: 0;
            height: 36px;
          }

          /* Its own layer, so the scrim dims the language menu too. */
          .nav-right {
            position: absolute;
            right: 1rem;
            z-index: 0;
          }

          .hamburger {
            display: flex;
          }

          /* Above the go-to-top button (99) while open, so the scrim dims it too. */
          nav.menu-open {
            z-index: 200;
          }

          .hamburger.open {
            position: fixed;
            top: var(--pinned-top);
            left: var(--pinned-left);
          }

          nav.home {
            position: absolute;
            background: linear-gradient(180deg, rgba(9, 9, 14, 0.75), transparent);
          }

          /* A drawer from the left over three quarters of the screen; the rest
             dims, and a tap there closes it. The hamburger sits above both. */
          .scrim {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 1;
            background: rgba(4, 4, 8, 0.62);
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0s linear 0.3s;
          }

          .scrim.open {
            opacity: 1;
            visibility: visible;
            transition: opacity 0.3s ease, visibility 0s;
          }

          nav ul {
            gap: 2px;
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            width: 75%;
            z-index: 2;
            background: linear-gradient(180deg, #0e0e18, var(--color-bg-secondary));
            border-right: 1px solid var(--border-gold-light);
            box-shadow: 12px 0 40px rgba(0, 0, 0, 0.55);
            flex-direction: column;
            overflow-y: auto;
            overscroll-behavior: contain;
            padding: 72px 10px 24px;
            transform: translateX(-102%);
            visibility: hidden;
            transition: transform 0.32s cubic-bezier(0.55, 0, 0.75, 0.3), visibility 0s linear 0.32s;
          }

          nav ul.open {
            transform: none;
            visibility: visible;
            transition: transform 0.38s cubic-bezier(0.22, 0.61, 0.36, 1), visibility 0s;
          }

          nav li.drawer-name {
            display: block;
            margin-top: auto;
            padding: 24px 16px 0;
            font-family: inherit;
            font-size: 10.5px;
            font-weight: 600;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: var(--color-gold-soft);
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
            padding: 10px 14px;
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
            transition: max-height 0.3s ease, opacity 0.25s ease, visibility 0s linear 0.3s;
          }

          nav ul.submenu.open {
            max-height: 60vh;
            padding: 0 0 4px;
            transform: none;
            transition: max-height 0.3s ease, opacity 0.25s ease, visibility 0s;
          }

          nav a.submenu-item {
            text-align: left;
            padding-left: 48px;
            font-size: 15px;
          }

        }

      `}
    </style>
      </>
    );
}
