import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 's3wn2p8r',
    dataset: 'production',
  },
  /**
   * The Studio is deployed to https://gospel-art.sanity.studio.
   *
   * `appId` identifies that deployed application; the CLI printed it on the
   * first deploy and asks for it on every later one if it is missing. It
   * replaces the deprecated top-level `studioHost`, which is only needed to
   * name a studio that does not exist yet. Not a secret — it is also listed
   * under the project's Studios tab in sanity.io/manage.
   *
   * `autoUpdates` lived at the top level until Sanity moved it in here.
   * Learn more at https://www.sanity.io/docs/cli#auto-updates
   */
  deployment: {
    appId: 'd57ukza06vuxev3cqmal9rpi',
    autoUpdates: true,
  },
})
