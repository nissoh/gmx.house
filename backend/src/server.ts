import { Connection, EntityManager, IDatabaseDriver, MikroORM, RequestContext } from '@mikro-orm/core'
import express, { RequestHandler } from 'express'

import http from 'http'
import { dto } from './dto'
import config from './mikro-orm.config'
import { awaitPromises, debounce, map, mergeArray } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import { JsonRpcProvider } from '@ethersproject/providers'
import { BSC_CONTRACTS, gambitContract } from 'gambit-middleware'

import { accountApi, leaderboardApi } from './api'
import path from 'path'
import { bscNini } from './rpc'
import { claimApi } from './api/claimAccount'
import { PositionClose, PositionUpdate } from './dto/Vault'


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
const port = process.env.PORT

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
        pos.indexToken as BSC_CONTRACTS,
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
        pos.indexToken as BSC_CONTRACTS,
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
        liqPos.indexToken as BSC_CONTRACTS,
        liqPos.collateralToken
      )

      return model
    }, vaultActions.liquidatePosition),

    map(async (closePosition) => {
      const position = await EM.findOne(dto.PositionIncrease, { key: closePosition.key })
        || await EM.findOne(dto.PositionDecrease, { key: closePosition.key })
        || await EM.findOne(dto.PositionLiquidated, { key: closePosition.key })

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
    }, vaultActions.closePosition),

    map(async (updatedPosition) => {
      const position = await EM.findOne(dto.PositionUpdate, { key: updatedPosition.key })
        || await EM.findOne(dto.PositionDecrease, { key: updatedPosition.key })
        || await EM.findOne(dto.PositionLiquidated, { key: updatedPosition.key })

      if (position === null) {
        return
      }

      const model = new dto.PositionUpdate(
        updatedPosition.averagePrice.toBigInt(),
        updatedPosition.entryFundingRate.toBigInt(),
        updatedPosition.reserveAmount.toBigInt(),
        updatedPosition.realisedPnl.toBigInt(),
        updatedPosition.collateral.toBigInt(),
        updatedPosition.size.toBigInt(),
        updatedPosition.key,
        position.account,
        position.isLong,
        position.indexToken,
        position.collateralToken
      )

      return model
    }, vaultActions.updatePosition)
  ])

  const mode = awaitPromises(
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
  )

  debounce(300, mode).run({
    async event(time, val) {
      EM.flush()
    },
    error(time, err) {
      console.error(err)
    },
    end() {}
  }, scheduler)

  

  const publicDir = __dirname + './../../../frontend/dist'

  app.use(express.json());   
  app.use(express.static(publicDir))
  app.use((req, res, next) => RequestContext.create(ORM.em, next))
  app.use('/api', leaderboardApi)
  app.use('/api', claimApi)
  app.use('/api', accountApi)
  app.use((req, res, next) => {
    
    if ((req.method === 'GET' || req.method === 'HEAD') && req.accepts('html')) {
      res.sendFile(path.join(publicDir, '/index.html'), err => err && next())
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
