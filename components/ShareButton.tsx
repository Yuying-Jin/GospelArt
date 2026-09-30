'use client'

import {Check, Share2} from 'lucide-react';
import {useState} from 'react';

type Props = {
    /** What the share sheet shows as the title. */
    title: string;
    /** Optional text the share sheet sends with the link. */
    text?: string;
    label: string;
    copiedLabel: string;
    /** Placement from the caller; in styled-jsx, pass it through `:global()`. */
    className?: string;
};

/**
 * Shares the current page: the system share sheet where there is one,
 * otherwise the link is copied and the label says so for two seconds.
 */
export default function ShareButton({title, text, label, copiedLabel, className}: Props) {
    const [copied, setCopied] = useState(false);

    const share = async () => {
        const url = window.location.href;

        if (navigator.share) {
            try {
                await navigator.share({title, text, url});
            } catch {
                // the visitor dismissed the share sheet
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard access unavailable; nothing to fall back to
        }
    };

    return (
        <button type="button" className={['share-button', className].filter(Boolean).join(' ')} onClick={share}>
            {copied
                ? <Check size={16} strokeWidth={1.75} aria-hidden="true" />
                : <Share2 size={16} strokeWidth={1.75} aria-hidden="true" />}
            <span aria-live="polite">{copied ? copiedLabel : label}</span>

            <style jsx>{`
              .share-button {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                min-height: 46px;
                min-width: 44px;
                padding: 0 24px;
                border: 1px solid var(--border-gold-strong);
                border-radius: 999px;
                background: transparent;
                color: var(--color-gold-secondary);
                font-family: inherit;
                font-size: 1rem;
                letter-spacing: 0.06em;
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
                transition: background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
              }

              .share-button:active {
                transform: scale(0.97);
              }

              .share-button:focus-visible {
                outline: 2px solid var(--color-gold-secondary);
                outline-offset: 3px;
              }

              @media (hover: hover) {
                .share-button:hover {
                  background: rgba(255, 215, 0, 0.08);
                  border-color: var(--color-gold-rich);
                  box-shadow: 0 0 20px var(--glow-gold-soft);
                }
              }

              @media (prefers-reduced-motion: reduce) {
                .share-button:active {
                  transform: none;
                }
              }

              @media (min-width: 1024px) {
                .share-button {
                  font-size: 1.05rem;
                }
              }
            `}</style>
        </button>
    );
}
