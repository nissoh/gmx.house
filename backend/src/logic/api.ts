import Router from 'express-promise-router'
import { verifyMessage } from "@ethersproject/wallet"
import { IClaimSource, isAddress, parseTwitterClaim, CHAIN, intervalInMsMap, IPagePositionParamApi, ITimerangeParamApi } from '@gambitdao/gmx-middleware'
import { EM } from '../server'
import { Claim } from './dto'
import { providerMainnet } from '../rpc'
import { prepareClient } from './common'
import { getIdentityFromENS } from 'common'
import { TypedDocumentNode } from '@urql/core'
import { cacheMap } from '../utils'

export const api = Router()

export const arbitrumGraph = prepareClient({
  fetch,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-arbitrum'
})
export const avalancheGraph = prepareClient({
  fetch,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-avalanche'
})


export const graphMap = {
  [CHAIN.ARBITRUM]: arbitrumGraph,
  [CHAIN.AVALANCHE]: avalancheGraph,
}

export const globalCache = cacheMap({})


api.get('/claim-list', async (req, res) => {
  // const claimList = await EM.find(Claim, {})
  res.send({})
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
    return res.status(403).json({ message: 'Signature hash does not match' })
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


export const fetchTrades = async <T, R extends IPagePositionParamApi, Z>(doc: TypedDocumentNode<T, R>, params: R, chain: CHAIN.ARBITRUM | CHAIN.AVALANCHE, offset: number, getList: (res: T) => Z[]): Promise<Z[]> => {
  const resp = (await graphMap[chain](doc, { ...params, offset }, { requestPolicy: 'network-only' }))

  const list = getList(resp)

  const nextOffset = offset + 1000

  if (nextOffset > 5000) {
    console.warn(`query has exceeded 5000 offset at timefram ${intervalInMsMap.DAY7}`)
    return list
  }

  if (list.length === 1000) {
    const newPage = await fetchTrades(doc, params, chain, nextOffset, getList)

    return [...list, ...newPage]
  }

  return list
}

export const fetchHistoricTrades = async <T, R extends IPagePositionParamApi & ITimerangeParamApi, Z>(doc: TypedDocumentNode<T, R>, params: R, chain: CHAIN.ARBITRUM | CHAIN.AVALANCHE, offset: number, getList: (res: T) => Z[]): Promise<Z[]> => {
  const deltaTime = params.to - params.from

  // splits the queries because the-graph's result limit of 5k items
  if (deltaTime >= intervalInMsMap.DAY7) {
    const splitDelta = Math.floor(deltaTime / 2)
    const query0 = fetchTrades(doc, { ...params, to: params.to - splitDelta }, chain, 0, getList)
    const query1 = fetchTrades(doc, { ...params, from: params.to - splitDelta }, chain, 0, getList)

    return (await Promise.all([query0, query1])).flatMap(res => res)
  }


  return fetchTrades(doc, params, chain, offset, getList)
}


