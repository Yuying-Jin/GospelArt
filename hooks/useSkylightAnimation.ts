import { useEffect } from 'react';

export function useSkylightAnimation() {
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        function moveSkylight() {
            const skylight : HTMLElement | null = document.querySelector('.skylight');
            if (!skylight) return;

            const maxX = window.innerWidth * 0.6;
            const duration = 15000;

            const targetX = Math.random() * maxX - maxX / 2;
            const targetOpacity = 0.7 + Math.random() * 0.3;

            skylight.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration / 3}ms ease-in-out`;
            skylight.style.transform = `translateX(calc(-50% + ${targetX}px))`;
            skylight.style.opacity = `${targetOpacity}`;

            timeoutId = setTimeout(moveSkylight, duration);
        }

        moveSkylight();

        return () => {
            clearTimeout(timeoutId);
        };
    }, []);
}
