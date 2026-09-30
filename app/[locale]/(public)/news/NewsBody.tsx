import { PortableText, type PortableTextComponents } from "next-sanity";
import FullscreenImage from "@/components/FullscreenImage";
import { ESV_URL } from "@/lib/esvCredit";
import type { NewsArticle, NewsBodyImage } from "@/types/news";
import articleStyle from "./article.module.css";

const isExternal = (href: string) => /^https?:\/\//.test(href);

function components(imageLabel: string): PortableTextComponents {
    return {
        types: {
            image: ({ value }: { value: NewsBodyImage }) => (
                <figure>
                    <FullscreenImage
                        src={value.url}
                        fullSrc={value.fullUrl}
                        alt={value.caption || imageLabel}
                        width={value.width}
                        height={value.height}
                        loading="lazy"
                    />
                    {value.caption && <figcaption>{value.caption}</figcaption>}
                </figure>
            ),
        },
        marks: {
            highlight: ({ children }) => <mark>{children}</mark>,
            underline: ({ children }) => <u>{children}</u>,
            "strike-through": ({ children }) => <s>{children}</s>,
            link: ({ value, children }) => {
                const href = typeof value?.href === "string" ? value.href : "";
                return isExternal(href) ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                ) : (
                    <a href={href}>{children}</a>
                );
            },
            // Crossway: the ESV mark links to esv.org wherever ESV text is shown.
            esv: ({ children }) => (
                <a className={articleStyle.esvCredit} href={ESV_URL} target="_blank" rel="noopener noreferrer">
                    {children}
                </a>
            ),
        },
    };
}

export default function NewsBody({ body, imageLabel }: { body: NewsArticle["body"]; imageLabel: string }) {
    return (
        <div className={articleStyle.prose}>
            <PortableText value={body} components={components(imageLabel)} />
        </div>
    );
}
