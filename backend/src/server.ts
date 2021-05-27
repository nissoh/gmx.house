import Koa from 'koa'
import useStatic from 'koa-static'
import path from 'path'

const staticDirPath = path.join(__dirname, '../../../frontend/.dist')

const app = new Koa()

app.use(useStatic(staticDirPath))


app.use(async ctx => {
  console.log(ctx)
  // ctx.body = file
})

console.log(`Running server http://localhost:8080`)

app.listen(8080)