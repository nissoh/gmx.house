import { Connection, EntityManager, IDatabaseDriver, MikroORM, RequestContext } from '@mikro-orm/core'
import express from 'express'
import http from 'http'
import { dto } from './dto'
import config from './mikro-orm.config'
import { awaitPromises, debounce, map, mergeArray } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import { JsonRpcProvider } from '@ethersproject/providers'
import { gambitContract } from 'gambit-middleware'

import { leaderboardApi } from './api'

const bscNini = new JsonRpcProvider(
  "https://bsc-dataseed1.ninicoin.io/",
  {
    chainId: 56,
    name: "bsc-mainnet",
  }
)

// const sessionParser = session({
//   saveUninitialized: false,
//   secret: '$eCuRiTy',
//   // genid: true,
//   resave: false
// })



const vaultActions = gambitContract(bscNini)


export let ORM: MikroORM<IDatabaseDriver<Connection>>
export let EM: EntityManager<IDatabaseDriver<Connection>>

const app = express()
const port = process.env.PORT || 3000

const server = http.createServer(app)


// const wss = new WebSocket.Server({ port: 8080 })

// wss.on('connection', ws => {
//   ws.on('message', message => {
//     console.log('received: %s', message)
//   })

//   ws.send('something')
// })

// const wss = new WebSocket.Server({ clientTracking: false, noServer: true })

// server.on('upgrade', function (request, socket, head) {
//   console.log('Parsing session from request...')

//   wss.handleUpgrade(request, socket, head, function (ws) {
//     wss.emit('connection', ws, request)
//   })
// })

// wss.on('connection', function (ws, request) {

//   ws.on('message', function (message) {
//     console.log(`Received message ${message} from user ${userId}`)
//   })

//   ws.on('close', function () {
    
//   })
// })


const run = async () => {
  ORM = await MikroORM.init(config)
  EM = ORM.em

  const scheduler = newDefaultScheduler()


  const modelChanges = mergeArray([
    map(async (pos) => {
      const model = new dto.PositionIncrease(
        pos.price.toBigInt(),
        pos.collateralDelta.toBigInt(),
        pos.sizeDelta.toBigInt(),
        pos.key,
        pos.account,
        pos.isLong,
        pos.indexToken,
        pos.collateralToken
      )

      return model
    }, vaultActions.increasePosition),

    map(async (pos) => {
      const model = new dto.PositionDecrease(
        pos.price.toBigInt(),
        pos.collateralDelta.toBigInt(),
        pos.sizeDelta.toBigInt(),
        pos.key,
        pos.account,
        pos.isLong,
        pos.indexToken,
        pos.collateralToken
      )

      return model
    }, vaultActions.decreasePosition),

    map(async (liqPos) => {
      const model = new dto.PositionLiquidated(
        liqPos.markPrice.toBigInt(),
        liqPos.reserveAmount.toBigInt(),
        liqPos.realisedPnl.toBigInt(),
        liqPos.collateral.toBigInt(),
        liqPos.size.toBigInt(),
        liqPos.key,
        liqPos.account,
        liqPos.isLong,
        liqPos.indexToken,
        liqPos.collateralToken
      )

      return model
    }, vaultActions.liquidatePosition),

    map(async (closePosition) => {
      const position = await EM.findOne(dto.PositionIncrease, { key: closePosition.key }) || await EM.findOne(dto.PositionDecrease, { key: closePosition.key })

      if (position === null) {
        return
      }

      const model = new dto.PositionClose(
        closePosition.averagePrice.toBigInt(),
        closePosition.entryFundingRate.toBigInt(),
        closePosition.reserveAmount.toBigInt(),
        closePosition.realisedPnl.toBigInt(),
        closePosition.collateral.toBigInt(),
        closePosition.size.toBigInt(),
        closePosition.key,
        position.account,
        position.isLong,
        position.indexToken,
        position.collateralToken
      )

      return model
    }, vaultActions.closePosition)
  ])

  const mode = debounce(300, awaitPromises(
    map(async modelQuery => {
      try {
        const model = await modelQuery
        if (model) {
          EM.persist(model)
        }
      } catch (err) {
        console.error(err)
      }
    }, modelChanges)
  ))

  mode.run({
    async event(time, val) {
      EM.flush()
    },
    error(time, err) {
      console.error(err)
    },
    end() {}
  }, scheduler)

  

  // app.use(express.json())
  app.use(express.static(__dirname + './../../../frontend/dist'))
  app.use((req, res, next) => RequestContext.create(ORM.em, next))
  app.use('/api', leaderboardApi)
  app.use((req, res) => res.status(404).json({ message: 'No route found' }))

  server.listen(port, () => {
    console.log(`express started at http://localhost:${port}`)
  })
}

run()
