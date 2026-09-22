'use client';

import {useTranslations} from 'next-intl';
import Header from "@/components/Header";
import {AuthPrompt} from "@/components/auth/AuthPrompt";
import {FormCardContainer} from "@/components/auth/FormCardContainer";
import {PasswordInput} from "@/components/auth/PasswordInput";
import authStyle from '../auth.module.css';

export default function LoginPage() {
    const t = useTranslations('public.auth');

    return (
        <>
            <Header title={t('login.title')} description={t('login.description')}/>
            <div className={authStyle["auth-container"]}>
                <FormCardContainer>
                    {/* No handler yet: submitting would otherwise reload the page
                        and lose what was typed. Wire this to the auth backend. */}
                    <form onSubmit={(e) => e.preventDefault()}>
                        <label htmlFor="email">{t('common.form.email')}</label>
                        <input id="email" type="email" placeholder="name@example.com"
                               required autoComplete="email"/>

                        <label htmlFor="password">{t('common.form.password')}</label>
                        <PasswordInput id="password"
                                       placeholder={t('common.form.password_placeholder')}
                                       required autoComplete="current-password"/>

                        <button type="submit">{t('common.button.submit')}</button>
                    </form>

                    <div className={authStyle["auth-prompts"]}>
                        <AuthPrompt
                            href="/auth/forget-password"
                            action={t('common.link.forgot_password')}
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
