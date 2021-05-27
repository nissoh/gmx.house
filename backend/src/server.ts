import Koa from 'koa'
import { Storage } from '@google-cloud/storage'
const app = new Koa()

app.use(async ctx => {
  ctx.body = 'Hello World'
})



// For more information on ways to initialize Storage, please see
// https://googleapis.dev/nodejs/storage/latest/Storage.html

// Creates a client using Application Default Credentials
const storage = new Storage({
  
})

// Creates a client from a Google service account key
// const storage = new Storage({keyFilename: 'key.json'});


// The ID of your GCS bucket
const bucketName = 'your-unique-bucket-name'

async function createBucket() {
  // Creates the new bucket
  await storage.createBucket(bucketName)
  console.log(`Bucket ${bucketName} created.`)
}

createBucket().catch(console.error)

app.listen(3000)