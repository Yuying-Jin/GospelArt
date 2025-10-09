'use client';

import {useLocale, useTranslations} from 'next-intl';
import Header from "@/components/Header";
import {FormCardContainer} from "@/components/auth/FormCardContainer";
// import type {TranslationTypes} from "@/messages/types"
import authStyle from '../auth.module.css';

export default function ForgotPasswordPage() {
    // const t = useTranslations<TranslationTypes['public']['auth']>('public.auth');
    const t = useTranslations('public.auth');
    const locale = useLocale();

    return (
        <>
            <Header
                title={t('forget_password.title')}
                description={t('forget_password.description')}
            />

            <div className={authStyle["auth-container"]}>
                <FormCardContainer>
                    <div className="auth-card">
                        <form>
                            <label htmlFor={"email"}>{t('common.form.email')}</label>
                            <input
                                type="email"
                                id={"email"}
                                placeholder="name@example.com"
                                required={true}
                                autoComplete={"email"}
                            />

                            <button type="submit">
                                {t('common.button.submit')}
                            </button>
                        </form>

                        <div className={authStyle["auth-links"]}>
                            {/* 回到登录 */}
                            <a href={`/${locale}/auth/login`}>
                                {t('login.title')}
                            </a>
                            {/* 去注册 */}
                            <a href={`/${locale}/auth/signup`}>
                                {t('signup.title')}
                            </a>
                        </div>
                    </div>
                </FormCardContainer>
            </div>
        </>
    );
}
