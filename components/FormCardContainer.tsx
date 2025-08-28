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
                max-width: 400px;
                box-shadow: 0 0 20px var(--shadow-strong);
                position: relative;
                overflow: hidden;

                flex: 1;
                padding: 2rem;
                border-radius: 10px;
                border: 2px solid rgba(255, 255, 255, 0.1);
              }


              /* 外部 form 元素生效 */
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
                font-size: 1.1rem;
                text-align: left;
                font-weight: 500;
              }

              .form-card-container :global(input) {
                background: var(--color-bg-card-alt);
                border: 1px solid var(--border-light);
                color: var(--text-primary);
                border-radius: 4px;
                padding: .8rem;
                font-size: .95rem;
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
                transition: background-color 5000s ease-in-out 0s; /* 阻止闪烁 */
              }

              .form-card-container :global(button[type="submit"]) {
                width: 100%;
                padding: 0.8rem 1.5rem;
                margin-top: 0.5rem;
                background: var(--color-gold-bright);
                color: var(--text-contrast);
                border: none;
                border-radius: 4px;
                font-size: 16px;
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
              
              @media (max-width: 746px) {
                .form-card-container {
                  padding: 1.5rem 1rem;
                }
              }
            `}</style>

        </div>
    );
}
