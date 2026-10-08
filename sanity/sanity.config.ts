import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {defaultDocumentNode, structure} from './structure'
import {ChangeGalleryUrlAction, ChangePageUrlAction} from './actions/changeUrl'
import {FetchScriptureAction} from './actions/fetchScripture'
import {MaxLengthInput} from './schemaTypes/components/MaxLengthInput'

/** The home page is one fixed document: it can be edited and published, never duplicated or deleted. */
const SINGLETON_ACTIONS = new Set(['publish', 'discardChanges', 'restore'])

// Neither of these is a secret — the project id travels with every client
// request and the dataset is public — so they are set here rather than making
// the Studio depend on an env file being present to start at all.
const projectId = 's3wn2p8r'
const dataset = 'production'

export default defineConfig({
  name: 'default',
  title: 'gospel-art',

  projectId,
  dataset,

  plugins: [structureTool({structure, defaultDocumentNode}), visionTool()],

  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter((template) => template.schemaType !== 'homePage'),
  },

  form: {
    components: {input: MaxLengthInput},
  },

  document: {
    newDocumentOptions: (options) => options.filter((option) => option.templateId !== 'homePage'),
    actions: (previousActions, context) => {
      if (context.schemaType === 'homePage') {
        return previousActions.filter((action) => action.action && SINGLETON_ACTIONS.has(action.action))
      }
      if (context.schemaType === 'artwork') {
        return [...previousActions, FetchScriptureAction, ChangeGalleryUrlAction]
      }
      if (context.schemaType === 'news') return [...previousActions, ChangePageUrlAction]
      return previousActions
    },
  },
})
