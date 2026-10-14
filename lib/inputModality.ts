/**
 * Whether the visitor's last input was the keyboard. Code that moves focus on
 * their behalf, such as a dialog opening or focus returning when it closes,
 * moves it visibly only then: phone browsers draw the focus ring for focus
 * moved by script even after a tap, so it would show where nobody asked.
 */
let keyboard = false

if (typeof window !== 'undefined') {
    // Capture phase, so the flag is set before the handlers that act on the input.
    window.addEventListener('keydown', (event) => {
        if (!event.metaKey && !event.ctrlKey && !event.altKey) keyboard = true
    }, true)
    window.addEventListener('pointerdown', () => {
        keyboard = false
    }, true)
}

export const lastInputWasKeyboard = () => keyboard
