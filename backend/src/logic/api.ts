import Router from 'express-promise-router'
import { requestChainlinkPricefeed } from './aggregatedTradeList'
import { now, runEffects, tap } from '@most/core'
import { scheduler } from './scheduler'


export const api = Router()



api.post('/feed', async (req, res) => {

  const stream = tap(data => {
    res.json(data)
  }, requestChainlinkPricefeed(now(req.body)))

  runEffects(stream, scheduler)
})



