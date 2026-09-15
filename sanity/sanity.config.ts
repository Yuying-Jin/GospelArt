import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {ChangeGalleryUrlAction} from './actions/changeGalleryUrl'
import {FetchScriptureAction} from './actions/fetchScripture'

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

  plugins: [structureTool({structure}), visionTool()],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (previousActions, context) =>
      context.schemaType === 'artwork'
        ? [...previousActions, FetchScriptureAction, ChangeGalleryUrlAction]
        : previousActions,
  },
})
