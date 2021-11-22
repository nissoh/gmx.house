import Router from 'express-promise-router'
import { requestChainlinkPricefeed } from './aggregatedTradeList'
import { awaitPromises, map, merge, multicast, now, periodic, runEffects, tap } from '@most/core'
import { scheduler } from './scheduler'
import { verifyMessage } from "@ethersproject/wallet"
import { getIdentityFromENS, IClaimSource, isAddress, parseTwitterClaim } from '@gambitdao/gmx-middleware'
import { EM } from '../server'
import { Claim } from './dto'
import { providerMainnet } from '../rpc'
import { prepareClient } from './common'
import { latestPricefeedMapQuery } from './queries'
import { O, replayLatest } from '@aelea/core'

export const api = Router()


export const vaultClient = prepareClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault',
  // requestPolicy: 'network-only'
})


export const chainlinkClient = prepareClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/deividask/chainlink',
  // requestPolicy: 'network-only'
})



export const latestPricefeedMap = O(
  map(async () => {
    const list = await chainlinkClient(latestPricefeedMapQuery, {})
    return list
  }),
  awaitPromises
)

export const latestPricefeedMapSource = replayLatest(multicast(merge(
  latestPricefeedMap(periodic(15000)),
  latestPricefeedMap(now(null))
)))

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
    existingClaim.data = JSON.stringify(null)
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
        existingClaim.data = JSON.stringify(ensData)
      }

      const claim = existingClaim ? existingClaim : new Claim(account, ensData.ensName, JSON.stringify(ensData), IClaimSource.ENS)


      await EM.persistAndFlush(claim)

      res.json(claim)
    } catch (err: any) {
      res.status(403).json({ message: err?.message })
    }
  }
})


