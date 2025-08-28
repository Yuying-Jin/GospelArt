'use client';

import Link from 'next/link';
import {useLocale, useTranslations} from 'next-intl';
import {navLinks} from "@/constants/nav";
import {usePathname} from "next/navigation";
import {useEffect, useRef, useState} from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MaterialSymbolsPersonOutline from "@/components/svg/MaterialSymbolsPersonOutline";
import {MaterialSymbolsAccountCircleFull} from "@/components/svg/MaterialSymbolsAccountCircleFull";

export default function Navbar() {
    const t = useTranslations('menu.navigation.items' as any);
    const locale = useLocale();
    const pathname = usePathname();

    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => setMenuOpen((v) => !v);
    const closeMenu = () => setMenuOpen(false);

    const navRef = useRef<HTMLElement>(null as any);

    // 点击其他地方关闭菜单
    useEffect(() => {
        function handleOutsideClick(e: MouseEvent) {
            if (menuOpen && navRef.current && !navRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [menuOpen]);

    // 滑动显示/隐藏nav, only for desktop view
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

            <div className="nav-left">Logo</div>

            <ul className={menuOpen ? 'open' : ''}>
            {navLinks.navigation.map(({ key, path }) => {
                const linkPath = `/${locale}/${path}`
                const isActive = pathname.startsWith(linkPath)

                return (
                  <li key={key}>
                    <Link href={linkPath} legacyBehavior>
                        <a className={`nav-item ${isActive ? "active" : ""}`}
                            onClick={closeMenu}>
                            {t(key)}
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
          fill: var(--text-primary);   /* 默认颜色 */
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

        nav a.nav-item {
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

        nav a.nav-item:hover,
        nav a.nav-item.active {
          color: var(--color-gold-secondary);
          font-weight: 600;
        }

        nav a.nav-item::after {
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
        nav a.nav-item.active::after {
          width: 70%;
        }

        nav a.nav-item::before {
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
        nav a.nav-item.active::before {
          transform: translateX(-50%) scale(1);
          opacity: 1;
        }

        /* Hamburger button 样式 */
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
          background: var(--color-gold-bright);
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

        /* --- 响应式调整 --- */
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
            padding-left: 10px;
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
            max-height: 600px; 
            opacity: 0.98;
            pointer-events: auto;
            padding-top: 10px;
            padding-bottom: 10px;
          }
          nav li {
            width: 100%;
            display: flex;
            justify-content: center;
          }
          nav li:has(> a.nav-item.active) {
            background: var(--color-bg-card-alt);
          }
          nav a.nav-item {
            font-size: 16px;
            padding: 8px 16px;
          }
          nav a.nav-item::before {
            top: -10px;
            font-size: 12px; 
          }
        }

      `}
    </style>
      </>
    );
}
