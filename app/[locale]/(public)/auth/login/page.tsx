'use client';

import {useLocale, useTranslations} from 'next-intl';
import Header from "@/components/Header";
import {FormCardContainer} from "@/components/FormCardContainer";
import {PasswordInput} from "@/components/PasswordInput";

export default function LoginPage() {
    const t = useTranslations('public.auth' as any);
    const locale = useLocale();

    return (
        <>
            <Header title={t('login.title')} description={t('login.description')}/>
            <div className="auth-container">
                <FormCardContainer>
                    <div className="auth-card">
                        <form>
                            <label>{t('common.form.email')}</label>
                            <input type="email" placeholder="name@example.com" />

                            <label>{t('common.form.password')}</label>
                            <PasswordInput label={t('common.form.password')} placeholder="********"/>

                            <button type="submit">{t('common.button.submit')}</button>
                        </form>

                        <div className="auth-links">
                            <a href={`/${locale}/auth/forget-password`}>{t('forget_password.title')}</a>
                            <a href={`/${locale}/auth/signup`}>{t('signup.title')}</a>
                        </div>
                    </div>
                </FormCardContainer>
            </div>

            <style jsx>{`
                .auth-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .auth-links {
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    padding: 5px 2px;
                  
                }
            `}</style>
        </>
    );
}
