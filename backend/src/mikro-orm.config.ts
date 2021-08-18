import { Options } from '@mikro-orm/core'
import { dto } from './dto'
// import { TsMorphMetadataProvider } from '@mikro-orm/reflection'

const options: Options = {
  type: 'mongo',
  entities: Object.values(dto),
  // metadataProvider: TsMorphMetadataProvider,
  dbName: 'gambit-portal',
  // highlighter: new MongoHighlighter(),
  // debug: true,
  ensureIndexes: true,
  clientUrl: process.env.DB_CLIENT_URL
}

export default options
