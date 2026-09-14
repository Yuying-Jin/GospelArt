import localeString from './objects/localeString'
import localeText from './objects/localeText'
import artworkSection from './objects/artworkSection'

import artwork from './documents/artwork'
import artworkSectionType from './documents/artworkSectionType'
import bibleTheme from './documents/bibleTheme'
import spiritualTheme from './documents/spiritualTheme'

export const schemaTypes = [
    // documents
    artwork,
    bibleTheme,
    spiritualTheme,
    artworkSectionType,
    // objects
    localeString,
    localeText,
    artworkSection,
]
