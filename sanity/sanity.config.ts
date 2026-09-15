import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {ChangeGalleryUrlAction} from './actions/changeGalleryUrl'
import {FetchScriptureAction} from './actions/fetchScripture'

// Falls back to the original hardcoded values so an existing checkout keeps
// working, but prefers env vars so the Studio and the Next.js app stop being
// two separate sources of truth for the project it points at.
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
