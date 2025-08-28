import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordInput({ placeholder }: { placeholder?: string }) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="password-field">
            <div className="input-wrapper">
                <input
                    type={visible ? "text" : "password"}
                    placeholder={placeholder || "********"}
                />
                <button
                    type="button"
                    className="toggle-btn"
                    onClick={() => setVisible(!visible)}
                    aria-label={visible ? "Hide password" : "Show password"}
                >
                    {visible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </div>

            <style jsx>{`
        .password-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          position: relative;
          width: 100%;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        input {
          width: 100%;
          padding: 12px 40px 12px 15px;
          font-size: 16px;
          border: 1px solid var(--border-light);
          border-radius: 6px;
          background: var(--color-bg-card-light);
          color: var(--text-primary);
        }

        input:focus {
          outline: none;
          border-color: var(--color-gold-bright);
          box-shadow: 0 0 10px var(--color-gold-glow);
        }

        button.toggle-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: color 0.3s ease;
        }

        button.toggle-btn:hover {
          color: var(--color-gold-accent);
        }

        button.toggle-btn :global(svg) {
          width: 20px;
          height: 20px;
        }
      `}</style>
        </div>
    );
}
