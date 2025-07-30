import { useEffect, useRef } from 'react';

export function useFadeInAnimation() {
    const refs = useRef<Set<Element>>(new Set());

    useEffect(() => {
        function checkFadeElements() {
            refs.current.forEach(el => {
                const rect = el.getBoundingClientRect();
                const isVisible = rect.top < window.innerHeight - 100 && rect.bottom > 0;
                if (isVisible) {
                    el.classList.add('active');
                }
            });
        }

        checkFadeElements();

        window.addEventListener('scroll', checkFadeElements);
        return () => {
            window.removeEventListener('scroll', checkFadeElements);
        };
    }, []);

    // 返回用于绑定 ref 的函数，方便用法 <div ref={bindRef} />
    function bindRef(el: Element | null) {
        if (el) refs.current.add(el);
        else refs.current.clear();
    }

    return bindRef;
}
