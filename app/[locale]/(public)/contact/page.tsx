'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Handshake, Images, Lightbulb, MessageSquareHeart, type LucideIcon } from 'lucide-react';
import Header from "@/components/Header";
import { allowTestEntry, simulatedRequest, testOutcome } from '@/lib/testTrigger';
import contactStyles from './contact.module.css';

type Status = 'idle' | 'sending' | 'sent' | 'invalid_email' | 'too_short' | 'rate_limited' | 'failed';

const RESULTS = ['sent', 'invalid_email', 'too_short', 'rate_limited', 'failed'] as const;

/** Mirrored in app/api/contact/route.ts, which counts after trimming too. */
const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 2000;

/** What the form is for, in place of contact details the form makes redundant. */
const TOPICS: { key: string; Icon: LucideIcon }[] = [
    { key: 'feedback', Icon: Lightbulb },
    { key: 'partnership', Icon: Handshake },
    { key: 'artwork', Icon: Images },
    { key: 'story', Icon: MessageSquareHeart },
];

export default function ContactPage() {
    const t = useTranslations('public.contact');
    const [status, setStatus] = useState<Status>('idle');
    const [messageLength, setMessageLength] = useState(0);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);

        // `test!` in the email field plays the result without sending; see lib/testTrigger.ts.
        const test = testOutcome(String(data.get('email') ?? ''), RESULTS, 'sent');
        if (test) {
            setStatus('sending');
            await simulatedRequest();
            if (test === 'sent') {
                form.reset();
                setMessageLength(0);
            }
            setStatus(test);
            return;
        }

        // minLength would count surrounding spaces, which the server drops.
        if (String(data.get('message') ?? '').trim().length < MESSAGE_MIN_LENGTH) {
            setStatus('too_short');
            return;
        }

        setStatus('sending');

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    name: data.get('name'),
                    email: data.get('email'),
                    message: data.get('message'),
                    website: data.get('website'),
                }),
            });
            const body = await response.json().catch(() => null);

            if (body?.ok) {
                form.reset();
                setMessageLength(0);
                setStatus('sent');
            } else if (body?.error === 'invalid_email' || body?.error === 'rate_limited') {
                setStatus(body.error);
            } else if (body?.error === 'invalid_message') {
                setStatus('too_short');
            } else {
                setStatus('failed');
            }
        } catch {
            setStatus('failed');
        }
    }

    return (
        <>
            <Header title={t('title')} description={t('description')}/>

            <section className={contactStyles['contact-section']}>
                <div className={contactStyles['contact-content']}>
                    <div className={contactStyles['contact-info']}>
                        <h3>{t('topics.heading')}</h3>
                        {TOPICS.map(({ key, Icon }) => (
                            <div key={key} className={contactStyles['contact-method']}>
                                <div className={contactStyles['contact-icon']} aria-hidden="true">
                                    <Icon size={26} strokeWidth={1.75} />
                                </div>
                                <div className={contactStyles['contact-detail']}>
                                    <h4>{t(`topics.${key}.title`)}</h4>
                                    <p>{t(`topics.${key}.body`)}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <form className={contactStyles['contact-form']} onSubmit={handleSubmit}>
                        <h3>{t('form.heading')}</h3>
                        <div className={contactStyles['form-group']}>
                            <label htmlFor="name">{t('form.name')}</label>
                            <input type="text" id="name" name="name" maxLength={100} required />
                        </div>

                        <div className={contactStyles['form-group']}>
                            <label htmlFor="email">{t('form.email')}</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                maxLength={254}
                                required
                                onInput={(event) => allowTestEntry(event.currentTarget)}
                            />
                        </div>

                        <div className={contactStyles['form-group']}>
                            <label htmlFor="message">{t('form.message')}</label>
                            <textarea
                                id="message"
                                name="message"
                                maxLength={MESSAGE_MAX_LENGTH}
                                aria-describedby="message-count"
                                onChange={(event) => setMessageLength(event.currentTarget.value.length)}
                                required
                            ></textarea>
                            <span id="message-count" className={contactStyles['char-count']}>
                                {messageLength} / {MESSAGE_MAX_LENGTH}
                            </span>
                        </div>

                        <input
                            type="text"
                            name="website"
                            className={contactStyles['form-row']}
                            tabIndex={-1}
                            autoComplete="off"
                            aria-hidden="true"
                        />

                        <button type="submit" className={contactStyles['submit-btn']} disabled={status === 'sending'}>
                            {t(status === 'sending' ? 'form.sending' : 'form.submit')}
                        </button>

                        {status !== 'idle' && status !== 'sending' && (
                            <p
                                className={contactStyles[status === 'sent' ? 'form-success' : 'form-error']}
                                role={status === 'sent' ? 'status' : 'alert'}
                            >
                                {t(`form.${status}`, {min: MESSAGE_MIN_LENGTH})}
                            </p>
                        )}
                    </form>
                </div>
            </section>
        </>
    );
}
