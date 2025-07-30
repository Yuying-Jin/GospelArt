'use client';

import Link from 'next/link';
import {useLocale, useTranslations} from 'next-intl';
import {navLinks} from "@/constants/nav";
import {usePathname} from "next/navigation";

export default function Navbar() {
    const t = useTranslations('nav' as any);
    const locale = useLocale();
    const pathname = usePathname();

    return (
        <>
            <nav>
                <ul>
                    {navLinks.navigation.map(({ key, path }) => {
                        const linkPath = `/${locale}/${path}`
                        const isActive = pathname.startsWith(linkPath)

                        return (
                            <li key={key}>
                                <Link
                                    href={linkPath}
                                    className={isActive ? "active" : ""}
                                >
                                    {t(key)}
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            <style jsx>{`
            .nav {
              padding: 20px 0;
              display: flex;
              justify-content: center;
              align-items: center;
              position: sticky;
              top: 0;
              z-index: 100;
              font-family: 'Noto Serif SC', 'Times New Roman', serif;
            }
    
            .link {
              color: var(--text-primary);
              text-decoration: none;
              padding: 10px 25px;
              margin: 0 15px;
              font-size: 18px;
              letter-spacing: 2px;
              position: relative;
              transition: all 0.3s ease;
            }
    
            .link:hover {
              color: var(--color-gold-secondary);
            }
    
            .link::after {
              content: "";
              position: absolute;
              bottom: 0;
              left: 50%;
              width: 0;
              height: 1px;
              background: linear-gradient(
                to right,
                rgba(230, 217, 165, 0),
                rgba(230, 217, 165, 0.7) 50%,
                rgba(230, 217, 165, 0)
              );
              transition: all 0.3s ease;
              transform: translateX(-50%);
            }
    
            .link:hover::after {
              width: 70%;
            }
    
            .link::before {
              content: "✦";
              position: absolute;
              top: -15px;
              left: 50%;
              transform: translateX(-50%) scale(0);
              color: rgba(230, 217, 165, 0.7);
              font-size: 14px;
              opacity: 0;
              transition: all 0.3s ease;
            }
    
            .link:hover::before {
              transform: translateX(-50%) scale(1);
              opacity: 1;
            }
    
            .active {
              color: var(--color-gold-secondary);
              font-weight: 500;
            }
    
            .active::after {
              width: 70%;
              background: linear-gradient(
                to right,
                rgba(230, 217, 165, 0),
                rgba(230, 217, 165, 0.9) 50%,
                rgba(230, 217, 165, 0)
              );
              height: 2px;
            }
    
            @media (max-width: 768px) {
              .nav {
                padding: 15px 0;
              }
              .link {
                padding: 8px 15px;
                margin: 0 8px;
                font-size: 16px;
              }
            }
    
            @media (max-width: 480px) {
              .nav {
                flex-direction: column;
                padding: 10px 0;
              }
              .link {
                margin: 5px 0;
                padding: 8px 0;
                width: 100%;
                text-align: center;
              }
              .link::before {
                top: -5px;
              }
              .link::after {
                bottom: -2px;
              }
            }
          `}
        </style>
    </>
    );
}
