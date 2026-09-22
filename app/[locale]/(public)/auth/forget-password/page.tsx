'use client';

import {useTranslations} from 'next-intl';
import Header from "@/components/Header";
import {AuthPrompt} from "@/components/auth/AuthPrompt";
import {FormCardContainer} from "@/components/auth/FormCardContainer";
import authStyle from '../auth.module.css';

export default function ForgotPasswordPage() {
    const t = useTranslations('public.auth');

    return (
        <>
            <Header
                title={t('forget_password.title')}
                description={t('forget_password.description')}
            />

            <div className={authStyle["auth-container"]}>
                <FormCardContainer>
                    {/* No handler yet — see login/page.tsx. */}
                    <form onSubmit={(e) => e.preventDefault()}>
                        <label htmlFor="email">{t('common.form.email')}</label>
                        <input
                            type="email"
                            id="email"
                            placeholder="name@example.com"
                            required
                            autoComplete="email"
                        />

                        <button type="submit">{t('common.button.submit')}</button>
                    </form>

                    <div className={authStyle["auth-prompts"]}>
                        <AuthPrompt
                            question={t('common.link.have_account')}
                            href="/auth/login"
                            action={t('login.title')}
                        />
                        <AuthPrompt
                            question={t('common.link.no_account')}
                            href="/auth/signup"
                            action={t('signup.title')}
                        />
                    </div>
                </FormCardContainer>
            </div>
        </>
    );
}
