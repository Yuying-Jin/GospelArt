// SkylightWrapper.tsx (Client Component)
'use client';

import {useSkylightAnimation} from "@/hooks/useSkylightAnimation";

export default function SkylightWrapper() {
    useSkylightAnimation();
    return (
        <div className="skylight"></div>
    );
}
