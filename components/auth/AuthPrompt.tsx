import {Link} from '@/i18n/navigation';

/**
 * The line under an auth form that sends you somewhere else: a muted question
 * and the answer as a link ("Already have an account? Log In"). `question` is
 * optional because "Forgot Password?" is already one.
 */
export function AuthPrompt({
    question,
    href,
    action,
}: {
    question?: string;
    href: string;
    action: string;
}) {
    return (
        <p className="auth-prompt">
            {question ? <span>{question}</span> : null}
            <Link href={href}>{action}</Link>

            <style jsx>{`
              /* Wraps as a unit on a narrow screen: the question and its answer
                 stay on the same line until neither fits. */
              .auth-prompt {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: baseline;
                gap: 0.35rem;
                margin: 0;
                font-size: 1rem;
                color: var(--text-secondary);
                text-align: center;
              }

              /* A full-width ？ already carries its own trailing space, so the
                 gap that separates the question from the link in English is
                 one space too many in Chinese. */
              :global(html[lang="zh-CN"]) .auth-prompt,
              :global(html[lang="zh-TW"]) .auth-prompt {
                gap: 0;
              }
            `}</style>
        </p>
    );
}
