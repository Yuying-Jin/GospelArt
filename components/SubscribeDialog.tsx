'use client';

import {CircleAlert, CircleCheck, MailCheck, X} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {useEffect, useRef} from 'react';

export type SubscribeResult =
    | 'pending'
    | 'already_subscribed'
    | 'already_pending'
    | 'rate_limited'
    | 'forgotten_email'
    | 'compliance_state'
    | 'failed';

type Props = {
    result: SubscribeResult;
    onClose: () => void;
};

/** Message key, icon and colour for each outcome the route can report. */
const PRESENTATION = {
    pending: {key: 'pending', Icon: MailCheck, tone: 'success'},
    already_subscribed: {key: 'alreadySubscribed', Icon: CircleCheck, tone: 'success'},
    already_pending: {key: 'alreadyPending', Icon: MailCheck, tone: 'success'},
    rate_limited: {key: 'rateLimited', Icon: CircleAlert, tone: 'notice'},
    forgotten_email: {key: 'forgotten', Icon: CircleAlert, tone: 'notice'},
    compliance_state: {key: 'restricted', Icon: CircleAlert, tone: 'notice'},
    failed: {key: 'failed', Icon: CircleAlert, tone: 'notice'},
} as const;

export default function SubscribeDialog({result, onClose}: Props) {
    const t = useTranslations('footer.subscribe');
    const panelRef = useRef<HTMLDivElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);

    const {key, Icon, tone} = PRESENTATION[result];

    // Focus starts on the confirm button and returns to whatever opened the
    // dialog, so keyboard users are not dropped back at the top of the page.
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        confirmRef.current?.focus();
        return () => previous?.focus?.();
    }, []);

    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
                return;
            }
            if (event.key !== 'Tab') return;

            // Only two buttons live in here, so the trap is just a wrap-around.
            const focusable = panelRef.current?.querySelectorAll('button');
            if (!focusable?.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="subscribe-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="subscribe-dialog-title"
            aria-describedby="subscribe-dialog-body"
            onClick={onClose}
        >
            <div
                className={`panel ${tone}`}
                ref={panelRef}
                onClick={(event) => event.stopPropagation()}
            >
                <button type="button" className="dismiss" onClick={onClose} aria-label={t('close')}>
                    <X size={20} strokeWidth={1.5} aria-hidden="true" />
                </button>

                <span className="badge" aria-hidden="true">
                    <Icon size={30} strokeWidth={1.5} />
                </span>

                <h2 id="subscribe-dialog-title">{t(`result.${key}.title`)}</h2>
                <p id="subscribe-dialog-body">{t(`result.${key}.body`)}</p>

                <button type="button" className="confirm" ref={confirmRef} onClick={onClose}>
                    {t('close')}
                </button>
            </div>

            <style jsx>{`
              .subscribe-dialog {
                position: fixed;
                inset: 0;
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                padding-top: max(20px, env(safe-area-inset-top));
                padding-bottom: max(20px, env(safe-area-inset-bottom));
                background: rgba(0, 0, 0, 0.72);
                backdrop-filter: blur(3px);
                animation: dialog-fade 180ms ease-out;
              }

              .panel {
                position: relative;
                width: 100%;
                max-width: 420px;
                max-height: calc(100dvh - 40px);
                overflow-y: auto;
                padding: 40px 28px 28px;
                text-align: center;
                background: var(--color-bg-secondary);
                border: 1px solid var(--border-gold-light);
                border-radius: 6px;
                box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
                animation: dialog-rise 240ms cubic-bezier(0.22, 0.61, 0.36, 1);
              }

              /* Echoes the gold hairline that tops the footer itself. */
              .panel::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(
                        90deg,
                        transparent 0%,
                        var(--border-gold-medium) 30%,
                        var(--border-gold-strong) 50%,
                        var(--border-gold-medium) 70%,
                        transparent 100%
                );
              }

              .dismiss {
                position: absolute;
                top: 8px;
                right: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                /* 44px keeps the tap target comfortable on a phone. */
                width: 44px;
                height: 44px;
                padding: 0;
                color: var(--text-tertiary);
                background: none;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: color 0.2s ease, background 0.2s ease;
              }

              .dismiss:hover {
                color: var(--color-gold-secondary);
                background: rgba(255, 255, 255, 0.06);
              }

              .badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 62px;
                height: 62px;
                margin-bottom: 18px;
                border-radius: 50%;
                border: 1px solid;
              }

              .success .badge {
                color: var(--color-gold-bright);
                border-color: var(--border-gold-medium);
                background: rgba(255, 215, 0, 0.08);
              }

              .notice .badge {
                color: rgba(255, 255, 255, 0.75);
                border-color: rgba(255, 255, 255, 0.2);
                background: rgba(255, 255, 255, 0.05);
              }

              h2 {
                margin: 0 0 12px;
                font-size: 19px;
                font-weight: 500;
                letter-spacing: 1px;
                color: var(--color-gold-secondary);
              }

              p {
                margin: 0 0 26px;
                font-size: 14.5px;
                line-height: 1.75;
                color: rgba(255, 255, 255, 0.78);
              }

              .confirm {
                width: 100%;
                min-height: 44px;
                padding: 11px 20px;
                font-family: inherit;
                font-size: 0.9rem;
                font-weight: 500;
                letter-spacing: 1px;
                color: rgba(20, 20, 30, 0.9);
                background: var(--color-gold-bright);
                border: none;
                border-radius: 3px;
                cursor: pointer;
                transition: background 0.3s ease, box-shadow 0.3s ease;
              }

              .confirm:hover {
                background: var(--color-gold-primary);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.25);
              }

              .dismiss:focus-visible,
              .confirm:focus-visible {
                outline: 2px solid var(--color-gold-secondary);
                outline-offset: 2px;
              }

              @keyframes dialog-fade {
                from { opacity: 0; }
                to { opacity: 1; }
              }

              @keyframes dialog-rise {
                from { opacity: 0; transform: translateY(12px) scale(0.98); }
                to { opacity: 1; transform: none; }
              }

              @media (max-width: 767px) {
                .panel {
                  padding: 36px 22px 24px;
                }
                h2 { font-size: 18px; }
              }

              @media (prefers-reduced-motion: reduce) {
                .subscribe-dialog,
                .panel {
                  animation: none;
                }
              }
            `}</style>
        </div>
    );
}
