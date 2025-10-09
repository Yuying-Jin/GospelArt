import React from "react";
import {GalleryModalProvider} from "@/stores/GalleryModalContext";

export default async function Layout({
                                         children,
                                     }: {
    children: React.ReactNode;
}) {

    return (
        <GalleryModalProvider>
            {children}
        </GalleryModalProvider>
    );
}