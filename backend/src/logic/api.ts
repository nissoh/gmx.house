import Router from 'express-promise-router'
import { requestChainlinkPricefeed } from './aggregatedTradeList'
import { now, runEffects, tap } from '@most/core'
import { scheduler } from './scheduler'
import { verifyMessage } from "@ethersproject/wallet"
import { getIdentityFromENS, IClaimSource, isAddress, parseTwitterClaim } from 'gambit-middleware'
import { EM } from '../server'
import { Claim } from './dto'
import { provider, providerMainnet } from '../rpc'

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

api.post('/claim-account-twitter', async (req, res) => {

  let parsedClaim

  try {
    parsedClaim = parseTwitterClaim(req.body.account, req.body.display)
  } catch (err) {
    console.error(err)
    return res.status(403).json(err)
  }

  const existingClaim = await EM.findOne(Claim, { account: { $eq: parsedClaim.account }, })

  if (existingClaim) {
    existingClaim.name = parsedClaim.name
    existingClaim.sourceType = parsedClaim.sourceType
  }

  const claim = existingClaim ? existingClaim : new Claim(parsedClaim.account, parsedClaim.name, '', parsedClaim.sourceType)

  const verifiedAddress = verifyMessage(req.body.display, req.body.signature)

  if (verifiedAddress !== claim.account) {
    return res.status(403).json({ message: 'Signature hash could not match' })
  }

  await EM.persistAndFlush(claim)

  res.json(claim)
})

api.post('/claim-account-ens', async (req, res) => {

  const account: string | undefined = req.body?.account

  if (!account) {
    return res.status(403).json({ message: 'No account given' })
  }

  const verifiedAddress = verifyMessage(account, req.body.signature)

  if (verifiedAddress !== account) {
    return res.status(403).json({ message: 'Signature hash could not match' })
  }

  if (isAddress(account)) {
    try {
      const ensData = await getIdentityFromENS(account, providerMainnet)
      const existingClaim = await EM.findOne(Claim, { account: { $eq: account }, })

      if (existingClaim) {
        existingClaim.name = ensData.ensName
        existingClaim.sourceType = IClaimSource.ENS
      }

      const claim = existingClaim ? existingClaim : new Claim(account, ensData.ensName, JSON.stringify(ensData), IClaimSource.ENS)


      await EM.persistAndFlush(claim)

      res.json(claim)
    } catch (err: any) {
      res.status(403).json({ message: err?.message })
    }
  }
})


