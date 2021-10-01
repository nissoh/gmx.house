import { Connection, EntityManager, IDatabaseDriver, MikroORM } from '@mikro-orm/core'
import { newDefaultScheduler } from '@most/scheduler'
import express from 'express'
import { readFileSync } from 'fs'
import http from 'http'
import path from 'path'
import ws from 'ws'
import { requestAccountAggregation, requestAccountListAggregation, requestAggregatedSettledTradeList, requestAggregatedClosedTrade, requestChainlinkPricefeed, requestLeaderboardTopList, requestOpenAggregatedTrades, requestAggregatedTrade } from './api'
import { accountApi } from './logic/account'
import { openGraphScreenshot } from './logic/linkOGShot'
import { helloFrontend } from './messageBus'


// @ts-ignore
BigInt.prototype.toJSON = function () { return this.toString() }

export let ORM: MikroORM<IDatabaseDriver<Connection>>
export let EM: EntityManager<IDatabaseDriver<Connection>>

const app = express()
const port = process.env.PORT

const server = http.createServer(app)

// const wss = new ws('wss://api.thegraph.com/subgraphs/name/nissoh/gmx-vault')
const wss = new ws.Server({ server, path: '/api-ws', })
const liveClients = new Map<ws, {ws: ws, isAlive: boolean}>()

wss.on('connection', function connection(ws) {
  const client = liveClients.get(ws)

  if (client) {
    client.isAlive = true
  }

  ws.on('pong', heartbeat)
})

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    const client = liveClients.get(ws)

    if (!client) {
      return
    }

    if (client.isAlive === false) {
      liveClients.delete(ws)
      return ws.terminate()
    }

    client.isAlive = false
    ws.ping()
  })
}, 30000)

wss.on('close', function close() {
  clearInterval(interval)
})

function heartbeat() {
  // @ts-ignore
  const client = liveClients.get(this)

  if (client) {
    client.isAlive = true
  }
}


// wss.on('connection', function connection(ws) {
//   connections.set(ws, { ws, isAlive: true })

//   ws.on('pong', (ws) => {
//     console.log(ws)
//     // connections.get(this.)
//   })
// })

const apiComponent = helloFrontend(wss, {
  requestAggregatedSettledTradeList,
  requestAccountAggregation,
  requestOpenAggregatedTrades,
  requestAccountListAggregation,
  requestLeaderboardTopList,
  requestChainlinkPricefeed,
  requestAggregatedClosedTrade,
  requestAggregatedTrade,
})


const run = async () => {
  // ORM = await MikroORM.init(config)
  // EM = ORM.em



  const scheduler = newDefaultScheduler()

  apiComponent
    .run({
      event(time, val) {
      
      },
      error(time, err) {
        console.error(err)
      },
      end() {}
    }, scheduler)

  

  const publicDir = path.resolve(process.cwd(), '.dist/cjs/public')
  const htmlFile = readFileSync(path.join(publicDir, '/index.html')).toString()



  app.use(express.json())
  app.use(express.static(publicDir))
  // app.use((req, res, next) => RequestContext.create(ORM.em, next))
  app.use('/api', openGraphScreenshot)
  // app.use('/api', claimApi)
  app.use('/api', accountApi)
  app.use((req, res, next) => {


    if ((req.method === 'GET' || req.method === 'HEAD') && req.accepts('html')) {

      const profilePageMatches = req.originalUrl.match(/(\/p\/account\/|0x[a-fA-F0-9]{40}$)/g)
      res.setHeader('content-type', 'text/html; charset=utf-8')

      const fullUrl = 'https://' + req.get('host')

      if (profilePageMatches?.length === 2) {
        const matchedAdress: string = profilePageMatches[1]
        const ogHtmlFile = htmlFile
          .replace(/\$OG_TITLE/g, 'GMX Profile')
          .replace(/\$OG_URL/g, fullUrl + req.originalUrl)
          .replace(/\$OG_TWITTER_DOMAIN/g, fullUrl)
          .replace(/\$OG_IMAGE/g, `${fullUrl}/api/og-account?account=${matchedAdress}`)
        
        res.send(ogHtmlFile)
      } else {
        const ogHtmlFile = htmlFile
          .replace(/\$OG_TITLE/g, 'GMX Commuinity')
          .replace(/\$OG_URL/g, fullUrl + req.originalUrl)
          .replace(/\$OG_TWITTER_DOMAIN/g, fullUrl)
          .replace(/\$OG_IMAGE/g, ``)

        res.send(ogHtmlFile)
      }
      
    } else {
      next()
    }
  })
  app.use((req, res) => res.status(404).json({ message: 'No route found' }))

  server.listen(port, () => {
    console.log(`express started at http://localhost:${port}`)
  })
}


run()
