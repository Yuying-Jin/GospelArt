'use client';

import {useLocale, useTranslations} from 'next-intl';
import Header from "@/components/Header";
import {FormCardContainer} from "@/components/auth/FormCardContainer";
import {PasswordInput} from "@/components/auth/PasswordInput";
import type {TranslationTypes} from "@/messages/types"
import authStyle from '../auth.module.css';

export default function LoginPage() {
    // const t = useTranslations<TranslationTypes['public']['auth']>('public.auth');
    const t = useTranslations('public.auth');
    const locale = useLocale();

    return (
        <>
            <Header title={t('login.title')} description={t('login.description')}/>
            <div className={authStyle["auth-container"]}>
                <FormCardContainer>
                    <div className="auth-card">
                        <form>
                            <label htmlFor={"email"}>{t('common.form.email')}</label>
                            <input id={"email"} type="email" placeholder="name@example.com"
                                   required={true} autoComplete={"email"}/>

                            <label htmlFor={"password"}>{t('common.form.password')}</label>
                            <PasswordInput id={"password"} placeholder="********"
                                           required={true} autoComplete={"password"}/>

                            <button type="submit">{t('common.button.submit')}</button>
                        </form>

                        <div className={authStyle["auth-links"]}>
                            <a href={`/${locale}/auth/forget-password`}>{t('forget_password.title')}</a>
                            <a href={`/${locale}/auth/signup`}>{t('signup.title')}</a>
                        </div>
                    </div>
                </FormCardContainer>
            </div>
        </>
    );
}
