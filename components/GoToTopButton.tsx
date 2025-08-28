"use client";

import React, { useEffect, useState } from "react";

export default function GoToTopButton() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        function onScroll() {
            setVisible(window.scrollY > 450);
        }
        window.addEventListener("scroll", onScroll);
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <a
            href="#"
            aria-label="Go to top"
            id="go-to-top"
            className={`${visible ? "" : "invisible"}`}
        >
            <svg
                viewBox="0 0 512 512"
                xmlns="http://www.w3.org/2000/svg"
                width={60}
                height={60}
                fill={"var(--color-gold-accent)"}
            >
                <g>
                    <path d="M256 464c114.9 0 208-93.1 208-208S370.9 48 256 48 48 141.1 48 256s93.1 208 208 208zm0-244.5l-81.1 81.9c-7.5 7.5-19.8 7.5-27.3 0s-7.5-19.8 0-27.3l95.7-95.4c7.3-7.3 19.1-7.5 26.6-.6l94.3 94c3.8 3.8 5.7 8.7 5.7 13.7 0 4.9-1.9 9.9-5.6 13.6-7.5 7.5-19.7 7.6-27.3 0l-81-79.9z" />
                </g>
            </svg>

            <style jsx>{`

              #go-to-top{
                position: fixed;
                right: 30px;
                bottom: 10px;
                cursor: pointer;
                opacity: 0.6;
                z-index: 99;
                visibility: visible;
                transition: opacity 0.3s ease, visibility 0.3s ease;
              }

              #go-to-top.invisible {
                cursor: pointer;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s ease, visibility 0.2s ease;
              }

              #go-to-top:hover{
                opacity:1;
              }
              
              @media (max-width: 768px) {
                #go-to-top {
                  right: 10px;
                }
              }
              
            `}</style>
        </a>
    );
}
