'use client';
import {useEffect} from "react";

/**
 * Turns off the casual ways of saving an artwork marked with PROTECTED_ARTWORK
 * (lib/protectedArtwork.ts): the right-click menu and
 * dragging it out, here; the long-press menu on phones, in globals.css. A
 * deterrent only: whatever a browser shows, it has downloaded, and a
 * screenshot or the image's address still gets it. Mounted once, in the
 * locale layout, so every marked picture is covered, the portalled
 * full-screen viewer included.
 */
export default function ArtworkImageGuard() {
    useEffect(() => {
        const block = (event: Event) => {
            if (event.target instanceof Element && event.target.closest("[data-protected-artwork]")) {
                event.preventDefault();
            }
        };
        document.addEventListener("contextmenu", block);
        document.addEventListener("dragstart", block);
        return () => {
            document.removeEventListener("contextmenu", block);
            document.removeEventListener("dragstart", block);
        };
    }, []);
    return null;
}
