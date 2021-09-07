import { Options } from '@mikro-orm/core'
// import { TsMorphMetadataProvider } from '@mikro-orm/reflection'

console.log(`Initiaiting DB connection with ${process.env.DB_CLIENT_URL}`)

const options: Options = {
  type: 'mongo',
  entities: [], // Object.values(dto),
  // metadataProvider: TsMorphMetadataProvider,
  dbName: 'gmx',
  // highlighter: new MongoHighlighter(),
  // debug: true,
  ensureIndexes: true,
  clientUrl: process.env.DB_CLIENT_URL
}

export default options
