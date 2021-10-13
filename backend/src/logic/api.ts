import Router from 'express-promise-router'
import { requestChainlinkPricefeed } from './aggregatedTradeList'
import { now, runEffects, tap } from '@most/core'
import { scheduler } from './scheduler'
import { verifyMessage } from "@ethersproject/wallet"
import { parseClaim } from 'gambit-middleware'
import { EM } from '../server'
import { Claim } from './dto'

export const api = Router()



api.post('/feed', async (req, res) => {

  const stream = tap(data => {
    res.json(data)
  }, requestChainlinkPricefeed(now(req.body)))

  runEffects(stream, scheduler)
})


api.get('/claim-list', async (req, res) => {
  const claimList = await EM.find(Claim, {})
  res.send(claimList)
})

api.post('/claim-account', async (req, res) => {

  let parsedClaim

  try {
    parsedClaim = parseClaim(req.body.account, req.body.display)
  } catch (err) {
    return res.status(403).json(err)
  }

  const existingClaim = await EM.findOne(Claim, { account: { $eq: parsedClaim.account }, })

  if (existingClaim) {
    existingClaim.name = parsedClaim.name
    existingClaim.sourceType = parsedClaim.sourceType
  }

  const claim = existingClaim ? existingClaim : new Claim(parsedClaim.account, parsedClaim.name, parsedClaim.sourceType)

  const verifiedAddress = verifyMessage(req.body.display, req.body.signature)

  if (verifiedAddress !== claim.account) {
    return res.status(403).json({ message: 'Signature hash could not match' })
  }

  await EM.persistAndFlush(claim)

  res.json(claim)
})


