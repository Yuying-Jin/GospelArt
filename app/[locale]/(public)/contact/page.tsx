'use client';

import { useTranslations } from 'next-intl';
import Header from "@/components/Header";
import contactStyles from './contact.module.css';

export default function ContactPage() {
    const t = useTranslations('public.contact');

    return (
        <>
            <Header title={t('title')} description={t('description')}/>

            <section className={contactStyles['contact-section']}>
                <div className={contactStyles['contact-content']}>
                    <div className={contactStyles['contact-info']}>
                        <div className={contactStyles['contact-method']}>
                            <div className={contactStyles['contact-icon']}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                </svg>
                            </div>
                            <div className={contactStyles['contact-detail']}>
                                <h4>电子邮件</h4>
                                <p>xxxx@xxxx.com</p>
                            </div>
                        </div>

                        <div className={contactStyles['contact-method']}>
                            <div className={contactStyles['contact-icon']}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-3 11H7v-2h10v2zm0-4H7V9h10v2z"/>
                                </svg>
                            </div>
                            <div className={contactStyles['contact-detail']}>
                                <h4>微信公众号</h4>
                                <p>福音书画xxxxx</p>
                            </div>
                        </div>

                        <div className={contactStyles['contact-method']}>
                            <div className={contactStyles['contact-icon']}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                </svg>
                            </div>
                            <div className={contactStyles['contact-detail']}>
                                <h4>地址</h4>
                                <p>美国佛罗里达州xxxxxxx</p>
                            </div>
                        </div>

                        <div className={contactStyles['contact-method']}>
                            <div className={contactStyles['contact-icon']}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M12 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-1.8C18 6.57 15.35 4 12 4s-6 2.57-6 6.2c0 2.34 1.95 5.44 6 9.14 4.05-3.7 6-6.8 6-9.14zM12 2c4.2 0 8 3.22 8 8.2 0 3.32-2.67 7.25-8 11.8-5.33-4.55-8-8.48-8-11.8C4 5.22 7.8 2 12 2z"/>
                                </svg>
                            </div>
                            <div className={contactStyles['contact-detail']}>
                                <h4>展览信息</h4>
                                <p>请关注我们的微信公众号获取最新展览信息</p>
                            </div>
                        </div>
                    </div>

                    <form className={contactStyles['contact-form']}>
                        <h3>发送信息</h3>
                        <div className={contactStyles['form-group']}>
                            <label htmlFor="name">您的姓名</label>
                            <input type="text" id="name" name="name" required />
                        </div>

                        <div className={contactStyles['form-group']}>
                            <label htmlFor="email">电子邮箱</label>
                            <input type="email" id="email" name="email" required />
                        </div>

                        <div className={contactStyles['form-group']}>
                            <label htmlFor="message">留言内容</label>
                            <textarea id="message" name="message" required></textarea>
                        </div>

                        <button type="submit" className={contactStyles['submit-btn']}>发送信息</button>
                    </form>
                </div>
            </section>
        </>
    );
}
