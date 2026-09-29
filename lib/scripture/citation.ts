/**
 * Displays a stored reference ("John 11:25") in the UI locale ("约翰福音 11:25").
 * The stored value stays English; anything that does not start with a
 * canonical book name is shown unchanged.
 */
import versification from './versification.json' with {type: 'json'}

const CHINESE_NAMES = new Map(
    versification.catalog.map((book) => [book.name, {'zh-CN': book.zhCNName, 'zh-TW': book.zhTWName}]),
)

/** Book, then everything from the chapter on. Lazy, so "1 John 4:16b" keeps "1 John". */
const CITATION = /^(.+?)\s+(\d.*)$/

export function localizeReference(reference: string, locale: string): string {
    if (locale !== 'zh-CN' && locale !== 'zh-TW') return reference
    const match = CITATION.exec(reference.trim())
    if (!match) return reference
    const names = CHINESE_NAMES.get(match[1])
    return names ? `${names[locale as 'zh-CN' | 'zh-TW']} ${match[2]}` : reference
}
