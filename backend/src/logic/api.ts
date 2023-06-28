import { CHAIN, intervalInMsMap, IPagePositionParamApi, ITimerangeParamApi } from '@gambitdao/gmx-middleware'
import { TypedDocumentNode } from '@urql/core'
import Router from 'express-promise-router'
import { cacheMap } from '../utils'
import { prepareClient } from './common'

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


