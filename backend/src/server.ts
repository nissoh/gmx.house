import { Connection, EntityManager, IDatabaseDriver, MikroORM } from '@mikro-orm/core'
import cors from 'cors'
import express from 'express'
import { readFileSync } from 'fs'
import http from 'http'
import path from 'path'
import ws from 'ws'
import { api } from './logic/api'
// import { competitionNov2021HighestPercentage, competitionNov2021LowestPercentage } from './logic/competition'
import { competitionCumulativePnl } from './logic/competition-cumulative-pnl'
import { scheduler } from './logic/scheduler'
import { helloFrontend } from './messageBus'
import config from './mikro-orm.config'
import compression from 'compression'
import { requestAccountTradeList, requestLatestPriceMap, requestLeaderboardTopList, requestOpenTrades, requestPricefeed, requestTrade } from './logic/trade'
import { competitionCumulativeRoi } from './logic/competition-cumulative-roi'


require('events').EventEmitter.prototype._maxListeners = 100

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
  } else {
    liveClients.set(ws, { isAlive: true, ws })
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



const apiComponent = helloFrontend(wss, {
  requestOpenTrades,
  requestAccountTradeList,
  requestLeaderboardTopList,
  requestTrade,
  // competitionNov2021HighestPercentage,
  // competitionNov2021LowestPercentage,
  competitionCumulativePnl,
  competitionCumulativeRoi,
  requestPricefeed,
  requestLatestPriceMap,
})


const run = async () => {
  ORM = await MikroORM.init(config)
  EM = ORM.em
  

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



  app.use(cors({}))
  app.use(express.json())
  app.use(compression())
  app.use(express.static(publicDir))
  app.use('/api', api)
  app.use((req, res, next) => {


    if ((req.method === 'GET' || req.method === 'HEAD') && req.accepts('html')) {

      const profilePageMatches = req.originalUrl.match(/(\/p\/account\/)(0x[a-fA-F0-9]{40}-(closed-\d+-\d+|liquidated-\d+-\d+|open-\d+-\d+))\/(0x[A-Fa-f0-9]{64})$/i)
      res.setHeader('content-type', 'text/html; charset=utf-8')

      const selfUrl = 'https://' + req.get('host')

      if (profilePageMatches?.length === 5) {
        const [token, tradeType, startDate, endDate] = profilePageMatches[2].split('-')
        const tradeId: string = profilePageMatches[4]
        const ogHtmlFile = htmlFile
          .replace(/\$OG_TITLE/g, 'Trade Details')
          .replace(/\$OG_URL/g, selfUrl + req.originalUrl)
          .replace(/\$OG_TWITTER_DOMAIN/g, selfUrl)
          .replace(/\$OG_IMAGE/g, `${process.env.OPENGRAPH_SERVICE}/og-trade-preview?tradeType=${tradeType}&tradeId=${tradeId}&startDate=${startDate}&endDate=${endDate}&token=${token}`)
        
        res.send(ogHtmlFile)

      } else {
        const ogHtmlFile = htmlFile
          .replace(/\$OG_TITLE/g, 'GMX.house')
          .replace(/\$OG_URL/g, selfUrl + req.originalUrl)
          .replace(/\$OG_TWITTER_DOMAIN/g, selfUrl)
          .replace(/\$$OG_DESCRIPTION/g, `Top GMX.io traders`)

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
