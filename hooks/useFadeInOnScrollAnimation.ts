import { useEffect } from "react";

export function useFadeInOnScrollAnimation() {
    useEffect(() => {
        function checkFadeElements() {
            const fadeElements = document.querySelectorAll('.fade-in-up:not(.fade-in-up-active)');
            fadeElements.forEach((element) => {
                const rect = element.getBoundingClientRect();
                const isVisible =
                    rect.top < window.innerHeight - 100 && rect.bottom > 0;

                if (isVisible) {
                    element.classList.add('fade-in-up-active');
                    console.log(element);
                }
            });
        }

        checkFadeElements();
        window.addEventListener('scroll', checkFadeElements);
        return () => {
            window.removeEventListener('scroll', checkFadeElements);
        };
    }, []);
}
