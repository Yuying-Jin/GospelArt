/**
 * Crossway asks for the ESV mark and a link to esv.org wherever ESV text is
 * shown. Editors write the mark ("(Psalm 19:1, ESV)"); this turns each "ESV"
 * in rich text into a span carrying the `esv` mark, which the renderer links.
 * A span that is already a link is left alone, since links cannot nest.
 */

export const ESV_MARK = 'esv'
export const ESV_URL = 'https://www.esv.org'

type Span = {_type?: string; _key?: string; text?: string; marks?: string[]}
type Block = {_type?: string; children?: Span[]; markDefs?: {_key: string; _type: string}[]}

const ESV = /\bESV\b/

export function markEsv<T extends Block>(blocks: T[]): T[] {
    return blocks.map((block) => {
        if (block._type !== 'block' || !block.children) return block

        const linkKeys = new Set((block.markDefs ?? []).filter((d) => d._type === 'link').map((d) => d._key))
        let found = false
        const children = block.children.flatMap((span) => {
            if (span._type !== 'span' || !span.text || !ESV.test(span.text)) return [span]
            if ((span.marks ?? []).some((mark) => linkKeys.has(mark))) return [span]

            found = true
            return span.text
                .split(/(\bESV\b)/)
                .filter(Boolean)
                .map((text, i) => ({
                    ...span,
                    _key: `${span._key ?? 'span'}-${i}`,
                    text,
                    marks: text === 'ESV' ? [...(span.marks ?? []), ESV_MARK] : span.marks ?? [],
                }))
        })

        return found ? {...block, children} : block
    })
}
