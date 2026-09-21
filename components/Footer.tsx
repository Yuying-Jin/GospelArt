'use client';

import {useState, type FormEvent} from 'react';
import Link from 'next/link';
import {useLocale, useTranslations} from 'next-intl';
import {navLinks} from "@/constants/nav";
import SubscribeDialog, {type SubscribeResult} from "@/components/SubscribeDialog";
import {usePathname} from "next/navigation";
import {TranslationTypes} from "@/messages/types";

/**
 * `navLinks.navigation` belongs to the navbar and is deliberately not repeated
 * here — see the note in `constants/nav.ts`. The footer carries `policy`, which
 * the navbar never shows and which is the only route to the terms page.
 */
const FOOTER_SECTION = 'policy' as const;

/** Outcomes the dialog has copy for; anything else is shown as a failure. */
const DIALOG_RESULTS = new Set<SubscribeResult>([
    'pending',
    'already_subscribed',
    'already_pending',
    'rate_limited',
    'forgotten_email',
    'compliance_state',
    'failed',
]);

// Matches the route's own check, so a malformed address never reaches the API.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Footer() {

    const t_menu = useTranslations('menu');
    const t_footer = useTranslations('footer');

    const locale = useLocale();
    const pathname = usePathname();

    const [sending, setSending] = useState(false);
    const [invalid, setInvalid] = useState(false);
    const [result, setResult] = useState<SubscribeResult | null>(null);

    async function handleSubscribe(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (sending) return;

        // Captured before the await: React clears currentTarget once the
        // handler returns.
        const form = event.currentTarget;
        const data = new FormData(form);
        const email = String(data.get('email') ?? '').trim();

        // A malformed address is the visitor's own field to fix, so it stays
        // inline. The dialog is reserved for answers that came back from the API.
        if (!EMAIL_PATTERN.test(email)) {
            setInvalid(true);
            return;
        }

        setSending(true);
        setInvalid(false);

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email, website: data.get('website')}),
            });

            const body = await response.json().catch(() => null);

            // Mailchimp rejects some addresses our pattern accepts; that is
            // still a field-level problem, not something to open a dialog for.
            if (body?.error === 'invalid_email' || body?.error === 'invalid_request') {
                setInvalid(true);
                return;
            }

            const outcome = body?.ok ? body.status : body?.error;
            setResult(DIALOG_RESULTS.has(outcome) ? outcome : 'failed');
            if (body?.ok) form.reset();
        } catch {
            setResult('failed');
        } finally {
            setSending(false);
        }
    }

    return (
      <>
        <footer>
            <div className="footer-content">
                <div className="footer-section">
                    <h3>{t_menu(`${FOOTER_SECTION}.title`)}</h3>
                    {
                        navLinks[FOOTER_SECTION].map(({ key, path }) => {
                            const linkPath = `/${locale}/${path}`
                            const isActive = pathname.startsWith(linkPath)
                            return (
                              <Link href={linkPath} key={key} legacyBehavior>
                                <a
                                    className={isActive ? "active" : ""}
                                >{t_menu(`${FOOTER_SECTION}.items.${key}`)}</a>
                              </Link>
                            );
                        })}
                </div>

                <div className="footer-section subscribe">
                    <h3>{t_footer(`subscribe.title`)}</h3>
                    <form onSubmit={handleSubscribe} noValidate>
                        <input
                            type="email"
                            name="email"
                            placeholder={t_footer(`subscribe.placeholder`)}
                            autoComplete="email"
                            aria-invalid={invalid}
                            onInput={() => invalid && setInvalid(false)}
                            required
                        />
                        <input
                            type="text"
                            name="website"
                            className="honeypot"
                            tabIndex={-1}
                            autoComplete="off"
                            aria-hidden="true"
                        />
                        <button type="submit" disabled={sending}>
                            {t_footer(sending ? `subscribe.sending` : `subscribe.button`)}
                        </button>
                        {invalid && (
                            <p className="subscribe-error" role="alert">
                                {t_footer(`subscribe.invalid`)}
                            </p>
                        )}
                    </form>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; {t_footer(`copyright`)}</p>
            </div>
        </footer>

        {result && <SubscribeDialog result={result} onClose={() => setResult(null)} />}

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

          /*
            Capped because the sections are flex: 1 — dropping the navigation
            column from three to two would otherwise hand the form half the
            footer and stretch the email field to roughly 540px.
          */
          .subscribe form {
            display: flex;
            flex-direction: column;
            width: 100%;
            max-width: 360px;
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

          /* Off-screen rather than display:none — some bots skip hidden fields. */
          .subscribe .honeypot {
            position: absolute;
            left: -9999px;
            width: 1px;
            height: 1px;
            opacity: 0;
          }

          .subscribe button[disabled] {
            opacity: 0.7;
            cursor: default;
          }

          .subscribe button[disabled]:hover {
            background: var(--color-gold-bright);
            box-shadow: none;
          }

          .subscribe-error {
            margin: 10px 0 0;
            font-size: 14px;
            line-height: 1.5;
            color: rgba(255, 255, 255, 0.75);
          }

          .subscribe input[type="email"][aria-invalid="true"] {
            border-color: rgba(255, 140, 140, 0.55);
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
