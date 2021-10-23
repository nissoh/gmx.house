import { Options } from '@mikro-orm/core'
import { Claim } from './logic/dto'
// import { TsMorphMetadataProvider } from '@mikro-orm/reflection'


const options: Options = {
  type: 'mongo',
  entities: [Claim], // Object.values(dto),
  // metadataProvider: TsMorphMetadataProvider,
  dbName: 'gmx-house',
  // highlighter: new MongoHighlighter(),
  // debug: true,
  ensureIndexes: true,
  clientUrl: process.env.DB_CLIENT_URL
}

export default options
