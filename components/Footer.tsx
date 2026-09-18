'use client';

import Link from 'next/link';
import {Fragment} from 'react';
import {useLocale, useTranslations} from 'next-intl';
import {GALLERY_NAV_KEY, navLinks} from "@/constants/nav";
import {usePathname} from "next/navigation";
import {TranslationTypes} from "@/messages/types";
import type {NavCollection} from "@/types/collection";

export default function Footer({collections = []}: {collections?: NavCollection[]}) {

    const t_menu = useTranslations('menu');
    const t_footer = useTranslations('footer');
    const t_collections = useTranslations('public.gallery.collections');

    const locale = useLocale();
    const pathname = usePathname();

    const galleryPath = `/${locale}/${GALLERY_NAV_KEY}`;

    /**
     * The gallery's own entry stays a link to the archive; the collections hang
     * under it indented, in the navbar's order. Exact matching, because the
     * gallery path is a prefix of every collection path.
     */
    const gallerySublinks = (
        <>
            {collections.map(({slug, title}) => {
                const collectionPath = `${galleryPath}/${slug}`;
                return (
                    <Link href={collectionPath} key={slug} legacyBehavior>
                        <a className={`footer-sublink ${pathname === collectionPath ? "active" : ""}`}>
                            {title}
                        </a>
                    </Link>
                );
            })}
            <Link href={galleryPath} legacyBehavior>
                <a className={`footer-sublink ${pathname === galleryPath ? "active" : ""}`}>
                    {t_collections('all')}
                </a>
            </Link>
        </>
    );

    return (
      <>
        <footer>
            <div className="footer-content">
                {Object.entries(navLinks).map(([section, links]) => (
                    <div key={section} className="footer-section">
                        <h3>{t_menu(`${section}.title`)}</h3>
                        {
                            links.map(({ key, path }) => {
                                const linkPath = `/${locale}/${path}`
                                const isActive = pathname.startsWith(linkPath)
                                const link = (
                                  <Link href={`/${locale}/${path}`} legacyBehavior>
                                    <a
                                        className={isActive ? "active" : ""}
                                    >{t_menu(`${section}.items.${key}`)}</a>
                                  </Link>
                                );

                                if (key === GALLERY_NAV_KEY && collections.length > 0) {
                                    return (
                                      <Fragment key={key}>
                                        {link}
                                        {gallerySublinks}
                                      </Fragment>
                                    );
                                }

                                return <Fragment key={key}>{link}</Fragment>;
                            })}
                    </div>
                ))}

                <div className="footer-section subscribe">
                    <h3>{t_footer(`subscribe.title`)}</h3>
                    <form>
                        <input type="email" placeholder={t_footer(`subscribe.placeholder`)} required />
                        <button type="submit">{t_footer(`subscribe.button`)}</button>
                    </form>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; {t_footer(`copyright`)}</p>
            </div>
        </footer>
        <style jsx>{`
          footer {
            background: var(--color-bg-secondary);
            color: rgba(255, 255, 255, 0.8);
            padding-top: 50px;
            margin-top: 40px;
            position: relative;
            font-family: 'Noto Serif SC', 'Times New Roman', serif;
            border-top: 1px solid var(--border-gold-light);
            box-shadow: 0 -5px 20px var(--shadow-normal);
          }

          footer::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(
                    90deg,
                    transparent 0%,
                    transparent 20%,
                    var(--border-gold-medium) 35%,
                    var(--border-gold-strong) 50%,
                    var(--border-gold-medium) 65%,
                    transparent 80%,
                    transparent 100%
            );
          }

          .footer-content {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 30px 40px;
          }

          .footer-section {
            flex: 1;
            min-width: 250px;
            margin: 0 20px 30px;
            display: flex;
            flex-direction: column;
          }

          .footer-section h3 {
            color: var(--color-gold-secondary);
            font-weight: 500;
            font-size: 18px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            position: relative;
            letter-spacing: 2px;
          }

          .footer-section h3::after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 0;
            width: 50px;
            height: 1px;
            background: linear-gradient(to right,
            rgba(255, 215, 0, 0.7),
            transparent);
          }

          .footer-section a {
            color: rgba(255, 255, 255, 0.7);
            text-decoration: none;
            margin-bottom: 12px;
            transition: all 0.3s ease;
            position: relative;
            display: inline-block;
          }

          /* Indented via padding so the hover translate still starts flush. */
          .footer-section a.footer-sublink {
            padding-left: 16px;
            font-size: 0.95em;
            color: rgba(255, 255, 255, 0.55);
          }

          .footer-section a::before{
            content: "•";
            position: absolute;
            left: -15px;
            color: var(--border-gold-strong);
            opacity: 0;
            transition: opacity 0.3s ease, transform 0.3s ease;
            transform: translateX(-5px);
          }
          
          .footer-section a:hover,
          .footer-section a.active {
            color: var(--color-gold-secondary);
            transform: translateX(5px);
          }

          .footer-section a:hover::before,
          .footer-section a.active::before {
            opacity: 1;
            transform: translateX(0);
          }

          .subscribe form {
            display: flex;
            flex-direction: column;
            width: 100%;
          }

          .subscribe input[type="email"] {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff;
            padding: 12px 15px;
            border-radius: 3px;
            margin-bottom: 10px;
            font-family: inherit;
            transition: all 0.3s ease;
          }

          .subscribe input[type="email"]:focus {
            background: rgba(255, 255, 255, 0.12);
            border-color: var(--border-gold-medium);
            outline: none;
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.1);
          }

          .subscribe input[type="email"]::placeholder {
            color: var(--text-tertiary);
          }

          .subscribe button {
            background: var(--color-gold-bright);
            color: rgba(20, 20, 30, 0.9);
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            border-radius: 3px;
            font-weight: 500;
            font-size: 0.9rem;
            letter-spacing: 1px;
            transition: all 0.3s ease;
            margin-top: 5px;
            position: relative;
            overflow: hidden;
          }

          .subscribe button::before {
            content: "";
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                    to right,
                    transparent,
                    rgba(255, 255, 255, 0.2),
                    transparent
            );
            transition: left 0.7s ease;
          }

          .subscribe button:hover {
            background: var(--color-gold-primary);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
          }

          .subscribe button:hover::before {
            left: 100%;
          }


          .footer-bottom {
            text-align: center;
            padding: 2px 10px;
            background: rgb(15, 15, 25);
            position: relative;
          }

          .footer-bottom p {
            color: var(--text-tertiary);
            font-size: 14px;
            margin: 0;
          }

          .footer-bottom::before {
            content: "";
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 300px;
            height: 1px;
            background: radial-gradient(
                    ellipse at center,
                    var(--border-gold-medium),
                    transparent 70%
            );
          }

          @media (max-width: 767px) {
            .footer-content {
              flex-direction: column;
              padding: 0 20px 30px;
            }
            .footer-section {
              margin: 0 0 30px;
            }
            .footer-section h3 {
              font-size: 16px;
            }
            .subscribe form {
              max-width: 100%;
            }
          }

          footer::after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 500px;
            height: 2px;
            background: radial-gradient(
                    ellipse at center,
                    var(--border-gold-medium) 0%,
                    transparent 70%
            );
            pointer-events: none;
            opacity: 0.6;
          }
          
        `}
        </style>
      </>
    );
};
