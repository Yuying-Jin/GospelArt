export function FormCardContainer({ children }: { children: React.ReactNode }) {
    return (
        <div className="form-card-container">

            {children}

            <style jsx>{`
              .form-card-container {
                display: flex;
                flex-direction: column;
                justify-content: center;
                background: var(--color-bg-card);
                width: 100%;
                max-width: 100%;
                box-shadow: 0 0 20px var(--shadow-strong);
                position: relative;
                overflow: hidden;
                padding: 1.5rem 1.25rem;
                border-radius: 10px;
                border: 2px solid rgba(255, 255, 255, 0.1);
              }

              .form-card-container :global(form) {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                width: 100%;
                z-index: 1;
              }

              .form-card-container :global(form) :global(label) {
                display: block;
                color: var(--text-primary);
                font-size: 1rem;
                text-align: left;
                font-weight: 500;
              }

              /* 1rem is a floor, not a preference: iOS Safari zooms the page
                 when a focused field is under 16px, and the zoom does not
                 undo itself. */
              .form-card-container :global(input) {
                background: var(--color-bg-card-alt);
                border: 1px solid var(--border-light);
                color: var(--text-primary);
                border-radius: 4px;
                padding: 0.85rem;
                font-size: 1rem;
              }

              .form-card-container :global(input:focus) {
                outline: none;
                background: var(--color-bg-card-alt);
                color: var(--text-secondary);
                border-color: var(--color-gold-glow);
                box-shadow: 0 0 10px var(--color-gold-glow);
              }

              .form-card-container :global(input:-webkit-autofill) {
                background-color: var(--color-bg-card-alt) !important;
                color: var(--text-secondary) !important;
                -webkit-text-fill-color: var(--text-secondary) !important;
                -webkit-box-shadow: 0 0 0 1000px var(--color-bg-card) inset !important;
                background-clip: padding-box;
                transition: background-color 5000s ease-in-out 0s; /* outlast Chrome's autofill repaint */
              }

              /* 24px is the smallest target WCAG 2.5.8 accepts. The label beside
                 it is clickable too, which is what makes this comfortable on a
                 phone. No padding: the box is sized, so padding only moves the
                 tick off centre. */
              .form-card-container :global(input[type="checkbox"]) {
                appearance: none;
                -webkit-appearance: none;
                flex: 0 0 auto;
                width: 1.5rem;
                height: 1.5rem;
                margin: 0;
                border: 2px solid var(--color-gold-bright);
                border-radius: 4px;
                position: relative;
                cursor: pointer;
                outline: none;
              }

              .form-card-container :global(input[type="checkbox"]:checked) {
                background-color: var(--color-gold-bright);
                border-color: var(--color-gold-bright);
              }

              .form-card-container :global(input[type="checkbox"]:checked::after) {
                content: "✔";
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 0.95rem;
                line-height: 1;
                color: var(--text-contrast);
              }

              .form-card-container :global(input[type="checkbox"]:focus-visible) {
                box-shadow: 0 0 0 3px var(--color-gold-glow);
              }

              .form-card-container :global(button[type="submit"]) {
                width: 100%;
                padding: 0.9rem 1.5rem;
                margin-top: 0.5rem;
                background: var(--color-gold-bright);
                color: var(--text-contrast);
                border: none;
                border-radius: 4px;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.3s ease;
              }

              .form-card-container :global(button[type="submit"]:hover) {
                background: var(--color-gold-primary);
                box-shadow: 0 0 20px var(--glow-gold-soft);
                transform: translateY(-2px);
              }

              .form-card-container :global(a) {
                color: var(--color-gold-secondary);
                transition: color 0.3s ease;
              }

              .form-card-container :global(a:hover) {
                color: var(--color-gold-accent);
                text-shadow: 0 0 6px white;
              }

              /* The card stops growing well before the viewport does: a login
                 form past ~480px is a long mouse trip between label and field,
                 not a better form. It must not shrink again on the way up,
                 which is what the old 768/1024 pair did (500px, then 450px). */
              @media (min-width: 560px) {
                .form-card-container {
                  max-width: 480px;
                  padding: 2rem;
                }
              }

              @media (min-width: 1024px) {
                .form-card-container {
                  padding: 2.5rem;
                }

                .form-card-container :global(input) {
                  font-size: 1.05rem;
                  padding: 1rem;
                }

                .form-card-container :global(button[type="submit"]) {
                  font-size: 1.05rem;
                  padding: 1rem 2rem;
                }
              }

              @media (prefers-reduced-motion: reduce) {
                .form-card-container :global(button[type="submit"]),
                .form-card-container :global(a) {
                  transition: none;
                }

                .form-card-container :global(button[type="submit"]:hover) {
                  transform: none;
                }
              }
            `}</style>

        </div>
    );
}
