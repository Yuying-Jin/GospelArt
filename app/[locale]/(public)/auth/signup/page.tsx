'use client';

import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import Header from "@/components/Header";
import {AuthPrompt} from "@/components/auth/AuthPrompt";
import {FormCardContainer} from "@/components/auth/FormCardContainer";
import {PasswordInput} from "@/components/auth/PasswordInput";
import {useState} from "react";
import authStyle from '../auth.module.css';

const ADJECTIVES = ["Graceful", "Joyful", "Peaceful", "Radiant", "Gentle"];
const NOUNS = ["Dove", "Olive", "Lily", "Shepherd", "Psalm"];

function generateRandomUsername() {
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adjective}${noun}${Math.floor(Math.random() * 1000)}`;
}

export default function SignupPage() {
    const t = useTranslations('public.auth');

    const [username, setUsername] = useState("");
    // Rolled up front rather than in an effect, so a suggestion is on screen at
    // first paint. Server and browser each roll their own, hence the suppressed
    // hydration warning below.
    const [suggestion] = useState(generateRandomUsername);

    return (
        <>
            <Header
                title={t('signup.title')}
                description={t('signup.description')}
            />

            <div className={authStyle["auth-container"]}>
                <FormCardContainer>
                    {/* No handler yet — see login/page.tsx. */}
                    <form onSubmit={(e) => e.preventDefault()}>
                        <label htmlFor="username">{t('common.form.username')}</label>
                        <div className="username-row">
                            <input
                                type="text"
                                id="username"
                                name="username"
                                placeholder={suggestion}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                suppressHydrationWarning
                            />

                            <button
                                type="button"
                                onClick={() => setUsername(generateRandomUsername())}
                                className="btn-random"
                            >
                                {t('common.button.random')}
                            </button>
                        </div>

                        <label htmlFor="email">{t('common.form.email')}</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="name@example.com"
                            required
                            autoComplete="email"
                        />

                        <label htmlFor="password">{t('common.form.password')}</label>
                        <PasswordInput id="password" placeholder="********" required
                                       autoComplete="new-password"/>

                        <label htmlFor="confirm_password">{t('common.form.confirm_password')}</label>
                        <PasswordInput id="confirm_password" placeholder="********" required
                                       autoComplete="new-password"/>

                        <div className="terms">
                            <input type="checkbox" id="agree" required/>
                            <label htmlFor="agree">
                                {t('signup.agree_text')}{' '}
                                <Link href="/privacy-policy" target="_blank">{t('signup.privacy_policy')}</Link> &{' '}
                                <Link href="/terms-of-use" target="_blank">{t('signup.terms_of_use')}</Link>
                            </label>
                        </div>

                        <button type="submit">{t('common.button.submit')}</button>
                    </form>

                    <div className={authStyle["auth-prompts"]}>
                        <AuthPrompt
                            question={t('common.link.have_account')}
                            href="/auth/login"
                            action={t('login.title')}
                        />
                    </div>
                </FormCardContainer>
            </div>

            <style jsx>{`
              .username-row {
                display: flex;
                align-items: stretch;
                gap: 8px;
              }

              /* min-width: 0 is the point of this rule. A flex item defaults to
                 min-width: auto, and an input's auto minimum is its ~20-character
                 intrinsic width, so the input refused to shrink and pushed the
                 button out of the card — 40px off at 390px, 67px at 360px, hidden
                 by the card's overflow: hidden. */
              .username-row input {
                flex: 1 1 auto;
                min-width: 0;
              }

              .btn-random {
                flex: 0 0 auto;
                white-space: nowrap;
                padding: 0 0.9rem;
                background: var(--color-gold-bright);
                color: var(--text-contrast);
                border: none;
                border-radius: 4px;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.3s ease;
              }

              .btn-random:hover {
                background: var(--color-gold-primary);
                box-shadow: 0 0 10px var(--glow-gold-soft);
              }

              .btn-random:focus-visible {
                outline: 2px solid var(--color-gold-secondary);
                outline-offset: 2px;
              }

              /* flex-start, not center: the label wraps to two or three lines on
                 a phone, and a centred box floats away from its first line. */
              .terms {
                display: flex;
                align-items: flex-start;
                gap: 0.6rem;
                margin-top: 0.25rem;
              }

              .terms label {
                font-size: 0.9rem;
                color: var(--text-secondary);
                line-height: 1.45;
                font-weight: 400;
              }

              @media (prefers-reduced-motion: reduce) {
                .btn-random {
                  transition: none;
                }
              }
            `}</style>
        </>
    );
}
