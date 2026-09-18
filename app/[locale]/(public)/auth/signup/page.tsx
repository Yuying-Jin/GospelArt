'use client';

import { useLocale, useTranslations } from 'next-intl';
import Header from "@/components/Header";
import { FormCardContainer } from "@/components/auth/FormCardContainer";
import { PasswordInput } from "@/components/auth/PasswordInput";
import {useState} from "react";
import authStyle from '../auth.module.css';

export default function SignupPage() {
    const t = useTranslations('public.auth');
    const locale = useLocale();

    const [username, setUsername] = useState("");
    // Generated up front rather than in an effect, so the suggestion is there
    // on first paint. The server and the browser each roll their own, which is
    // why the input below suppresses the hydration warning.
    const [placeholder, setPlaceholder] = useState(generateRandomUsername);
    const [agreed, setAgreed] = useState(false);


    function generateRandomUsername() {
        const adjectives = ["Graceful", "Joyful", "Peaceful", "Radiant", "Gentle"];
        const nouns = ["Dove", "Olive", "Lily", "Shepherd", "Psalm"];
        const number = Math.floor(Math.random() * 1000);

        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];

        return `${adjective}${noun}${number}`;
    }

    function handleClickInput() {
        if (!username) {
            setUsername(placeholder);
        }
    }

    function submit() {
        console.log("username");
    }

    return (
        <>
            <Header
                title={t('signup.title')}
                description={t('signup.description')}
            />

            <div className={authStyle["auth-container"]}>
                <FormCardContainer>
                    <div className="auth-card">
                        <form>
                            <label htmlFor="username">{t('common.form.username')}</label>
                            <div className="username-input">
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    placeholder={placeholder}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onClick={handleClickInput}
                                    autoComplete="off"
                                    suppressHydrationWarning
                                />

                                <button type="button"
                                        onClick={() => setPlaceholder(generateRandomUsername())}
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
                                required={true}
                                autoComplete="off"
                            />

                            <label htmlFor="password">{t('common.form.password')}</label>
                            <PasswordInput id="password" placeholder="********" required={true} />

                            <label htmlFor="confirm_password">{t('common.form.confirm_password')}</label>
                            <PasswordInput id="confirm_password" placeholder="********" required={true} />

                            <div className="terms">
                                <input
                                    type="checkbox"
                                    id="agree"
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                    required={true}
                                />
                                <label htmlFor="agree">
                                    {t('signup.agree_text')}{' '}
                                    <a href={`/${locale}/privacy-policy`} target="_blank">{t('signup.privacy_policy')}</a> &{' '}
                                    <a href={`/${locale}/terms-of-use`} target="_blank">{t('signup.terms_of_service')}</a>
                                </label>
                            </div>

                            <button type="submit" onClick={submit}>
                                {t('common.button.submit')}
                            </button>
                        </form>

                        <div className={authStyle["auth-links"]}>
                            <a href={`/${locale}/auth/login`}>
                                {t('login.title')}
                            </a>
                            <a href={`/${locale}/auth/forget-password`}>
                                {t('forget_password.title')}
                            </a>
                        </div>
                    </div>
                </FormCardContainer>
            </div>

            <style jsx>{`
                .username-input {
                  display: flex;
                  justify-content: space-between;
                  gap: 8px;
                }

                .username-input input {
                  flex: 1;
                }
                
                .btn-random {
                  flex: 0 0 auto;
                  padding: .8rem .8rem;
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

                .terms {
                  display: inline-flex;
                  align-items: center;
                  gap: .8rem;
                }
                
                .terms label {
                  font-size: 0.9rem;
                  color: var(--text-secondary);
                  line-height: 0.95rem;
                }
                
            `}</style>
        </>
    );
}
