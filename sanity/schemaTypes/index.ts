import localeString from './objects/localeString'
import localeText from './objects/localeText'
import localeRichText from './objects/localeRichText'
import artworkSection from './objects/artworkSection'
import collectionRules from './objects/collectionRules'

import artwork from './documents/artwork'
import artworkSectionType from './documents/artworkSectionType'
import bibleTheme from './documents/bibleTheme'
import collection from './documents/collection'
import news from './documents/news'
import spiritualTheme from './documents/spiritualTheme'

export const schemaTypes = [
    // documents
    artwork,
    collection,
    news,
    bibleTheme,
    spiritualTheme,
    artworkSectionType,
    // objects
    localeString,
    localeText,
    localeRichText,
    artworkSection,
    collectionRules,
]
