import {useState} from "react";
import {useTranslations} from "next-intl";
import {Eye, EyeOff} from "lucide-react";

interface PasswordInputProps {
    id: string;
    placeholder: string;
    required?: boolean;
    autoComplete?: string;
}

export function PasswordInput({id, placeholder, required, autoComplete}: PasswordInputProps) {
    const t = useTranslations('public.auth.common.form');
    const [visible, setVisible] = useState(false);

    return (
        <div className="input-wrapper">
            <input
                className="with-toggle"
                type={visible ? "text" : "password"}
                id={id}
                placeholder={placeholder}
                required={required}
                autoComplete={autoComplete || "off"}
            />
            <button
                type="button"
                className="toggle-btn"
                onClick={() => setVisible(!visible)}
                aria-label={visible ? t('hide_password') : t('show_password')}
                aria-pressed={visible}
            >
                {visible ? <EyeOff size={20} strokeWidth={1.75}/> : <Eye size={20} strokeWidth={1.75}/>}
            </button>

            <style jsx>{`
              .input-wrapper {
                position: relative;
                display: flex;
                align-items: center;
              }

              /* Everything else about the field comes from FormCardContainer, so
                 the password and email inputs stay identical. Only the room for
                 the toggle is ours; the class outranks the container's rule. */
              input.with-toggle {
                width: 100%;
                padding-right: 3rem;
              }

              /* 44px of tappable area around a 20px icon: the icon sits inside
                 the field, so the target can only grow inwards. */
              .toggle-btn {
                position: absolute;
                right: 0;
                width: 44px;
                height: 44px;
                background: none;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--text-secondary);
                transition: color 0.3s ease;
                -webkit-tap-highlight-color: transparent;
              }

              .toggle-btn:hover {
                color: var(--color-gold-accent);
              }

              .toggle-btn:focus-visible {
                outline: 2px solid var(--color-gold-secondary);
                outline-offset: -4px;
                border-radius: 4px;
              }
            `}</style>
        </div>
    );
}
