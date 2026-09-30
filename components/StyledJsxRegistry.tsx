'use client'

import {useServerInsertedHTML} from 'next/navigation';
import {useState, type ReactNode} from 'react';
import {createStyleRegistry, StyleRegistry} from 'styled-jsx';

/**
 * Writes every styled-jsx rule into the server-rendered HTML, as Next's
 * CSS-in-JS guide sets it up. Without it the App Router renders none of them,
 * so the navbar, footer and page header stay unstyled until JavaScript runs,
 * and for good if it never does.
 */
export default function StyledJsxRegistry({children}: {children: ReactNode}) {
    const [registry] = useState(() => createStyleRegistry());

    useServerInsertedHTML(() => {
        const styles = registry.styles();
        registry.flush();
        return <>{styles}</>;
    });

    return <StyleRegistry registry={registry}>{children}</StyleRegistry>;
}
