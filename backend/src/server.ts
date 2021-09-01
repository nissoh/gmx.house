import { Connection, EntityManager, IDatabaseDriver, MikroORM, RequestContext } from '@mikro-orm/core'
import express from 'express'

import http from 'http'
import { readFileSync } from 'fs'
import config from './mikro-orm.config'
import { debounce, merge, tap } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'

import path from 'path'
import { accountApi } from './logic/account'
import { claimApi } from './logic/claimAccount'
import { helloFrontend } from './messageBus'
import { aggregatedTradeSettled, leaderboard, tournament } from './api'
import { initAggTrades, modelChanges, openPositions } from './logic/positions'
import { AggregatedTrade, AggregatedTradeSettled } from './dto/Vault'
import { openGraphScreenshot } from './logic/linkOGShot'


// @ts-ignore
BigInt.prototype.toJSON = function () { return this.toString() }

export let ORM: MikroORM<IDatabaseDriver<Connection>>
export let EM: EntityManager<IDatabaseDriver<Connection>>

const app = express()
const port = process.env.PORT

const server = http.createServer(app)




const apiComponent = helloFrontend('/api-ws', server, {
  aggregatedTradeSettled,
  leaderboard,
  tournament,
})

const run = async () => {
  ORM = await MikroORM.init(config)
  EM = ORM.em

  const aggregatedTradesSettled = await EM.find(AggregatedTradeSettled, {}, { populate: true })
  const aggregatedTrades = await EM.find(AggregatedTrade, {})

  if (aggregatedTradesSettled.length === 0 && aggregatedTrades.length === 0) {
    await initAggTrades()
  } else {
    aggregatedTrades.forEach(agg => openPositions.set(agg.key, agg))
  }

  console.log(`Initiating with ${openPositions.size} open positions`)

  EM.flush()


  const scheduler = newDefaultScheduler()
  const writeToDb = debounce(1500, tap(async model => {
    return EM.persist(model)
  }, modelChanges))

  merge(
    tap(() => {
      try {
        EM.flush()
      } catch (e) {
        console.error(e)
      }
    }, writeToDb),
    apiComponent
  )
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
  app.use((req, res, next) => RequestContext.create(ORM.em, next))
  app.use('/api', openGraphScreenshot)
  app.use('/api', claimApi)
  app.use('/api', accountApi)
  app.use((req, res, next) => {


    if ((req.method === 'GET' || req.method === 'HEAD') && req.accepts('html')) {

      const profilePageMatches = req.originalUrl.match(/(\/p\/account\/|0x[a-fA-F0-9]{40}$)/g)
      res.setHeader('content-type', 'text/html; charset=utf-8')

      if (profilePageMatches?.length === 2) {
        const matchedAdress: string = profilePageMatches[1]
        const fullUrl = 'https://' + req.get('host')
        const ogHtmlFile = htmlFile
          .replace(/\$OG_TITLE/g, 'GMX Profile')
          .replace(/\$OG_URL/g, fullUrl + req.originalUrl)
          .replace(/\$OG_TWITTER_DOMAIN/g, fullUrl)
          .replace(/\$OG_IMAGE/g, `${fullUrl}/api/og-account?account=${matchedAdress}`)
        
        res.end(ogHtmlFile)
      } else {
        res.end(htmlFile)
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
