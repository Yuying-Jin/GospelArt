// One path per icon: version 5 of @sanity/icons exports them by name only there.
import {DocumentIcon} from '@sanity/icons/Document'
import {EditIcon} from '@sanity/icons/Edit'
import {FilterIcon} from '@sanity/icons/Filter'
import {FolderIcon} from '@sanity/icons/Folder'
import {StackCompactIcon} from '@sanity/icons/StackCompact'
import {TagIcon} from '@sanity/icons/Tag'
import {TagsIcon} from '@sanity/icons/Tags'

/*
 * Artworks, news and the home page are the content staff manage directly,
 * and share one icon; collections and the vocabularies keep their own. Views,
 * filtered lenses over the documents, and the bulk editors each have one too.
 */
export const CONTENT_ICON = DocumentIcon
export const COLLECTION_ICON = FolderIcon
export const BIBLE_THEME_ICON = TagIcon
export const SPIRITUAL_THEME_ICON = TagsIcon
export const SECTION_TYPE_ICON = StackCompactIcon
export const VIEW_ICON = FilterIcon
export const BULK_EDIT_ICON = EditIcon
