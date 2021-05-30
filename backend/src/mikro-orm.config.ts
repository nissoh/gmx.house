import { Options } from '@mikro-orm/core'
import { dto } from './dto'

const options: Options = {
  type: 'mongo',
  entities: Object.values(dto),
  // metadataProvider: TsMorphMetadataProvider,
  dbName: 'gambit-portal',
  // highlighter: new MongoHighlighter(),
  // debug: true,
  ensureIndexes: true,
  clientUrl: `mongodb+srv://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@cluster0.uytom.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`
}

export default options
