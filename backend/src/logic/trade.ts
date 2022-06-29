
import { O, replayLatest } from '@aelea/core'
import { awaitPromises, combine, constant, map, merge, multicast, now, periodic, snapshot } from '@most/core'
import {
  calculatePositionDelta, fromJson, ILeaderboardRequest,
  intervalInMsMap, IPricefeedParamApi, IRequestTradeQueryparam,
  pagingQuery, toAccountSummary, IOpenTradesParamApi, unixTimestampNow, CHAIN, IChainParamApi, IPriceLatestMap, groupByMap, IPageHistoricParamApi, IPagePositionParamApi
} from '@gambitdao/gmx-middleware'
import { cacheMap } from '../utils'
import { graphMap } from './api'
import { tradeQuery, accountTradeListQuery, IAccountTradeListParamApi, latestPriceTimelineQuery, pricefeed, tradeHistoricListQuery, tradeOpenListQuery } from './queries'
import { TypedDocumentNode } from '@urql/core'

const createCache = cacheMap({})


const fetchTrades = async <T, R extends IPagePositionParamApi, Z>(doc: TypedDocumentNode<T, R>, params: R, chain: CHAIN.ARBITRUM | CHAIN.AVALANCHE, offset: number, getList: (res: T) => Z[]): Promise<Z[]> => {
  console.log('fetching offset ' + offset)
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

const fetchHistoricTrades = async <T, R extends IPageHistoricParamApi, Z>(doc: TypedDocumentNode<T, R>, params: R, chain: CHAIN.ARBITRUM | CHAIN.AVALANCHE, offset: number, getList: (res: T) => Z[]): Promise<Z[]> => {
  const deltaTime = params.to - params.from

  // splits the queries because the-graph's result limit of 5k items
  if (deltaTime >= intervalInMsMap.DAY7) {
    const splitDelta = deltaTime / 2
    const query0 = fetchTrades(doc, { ...params, to: params.to - splitDelta }, chain, 0, getList)
    const query1 = fetchTrades(doc, { ...params, from: params.to + splitDelta }, chain, 0, getList)

    return (await Promise.all([query0, query1])).flatMap(res => res)
  }


  return fetchTrades(doc, params, chain, offset, getList)
}



export const tradeByTimespan = map((queryParams: IChainParamApi & IPageHistoricParamApi) => {
  const query = createCache('tradeByTimespan' + queryParams.from, intervalInMsMap.MIN5, async () => {
    const from = Math.floor(queryParams.from)
    const to = Math.min(unixTimestampNow(), queryParams.to)

    return fetchTrades(tradeHistoricListQuery, { from, to, offset: 0, pageSize: 1000 }, queryParams.chain, 0, (res) => res.trades)
  })

  return { query, queryParams }
})

const cacheLifeMap = {
  [intervalInMsMap.HR24]: intervalInMsMap.MIN5,
  [intervalInMsMap.DAY7]: intervalInMsMap.MIN30,
  [intervalInMsMap.MONTH]: intervalInMsMap.MIN60,
}

export const requestLeaderboardTopList = O(
  map(async (queryParams: ILeaderboardRequest) => {
    const cacheLife = cacheLifeMap[queryParams.timeInterval]
    const cacheKey = 'requestLeaderboardTopList' + queryParams.timeInterval + queryParams.chain

    const list = createCache(cacheKey, cacheLife, async () => {
      const timeNow = unixTimestampNow()
      const from = timeNow - queryParams.timeInterval

      const tradeList = await fetchHistoricTrades(tradeHistoricListQuery, { from, to: timeNow, offset: 0, pageSize: 1000 }, queryParams.chain, 0, res => res.trades)
      const formattedList = tradeList.map(fromJson.toTradeJson)
      const summary = toAccountSummary(formattedList)

      return summary
    })


    return pagingQuery(queryParams, list)
  }),
  awaitPromises
)

export const requestAccountTradeList = O(
  map(async (queryParams: IAccountTradeListParamApi) => {
    const allAccounts = await graphMap[queryParams.chain](accountTradeListQuery, { ...queryParams, account: queryParams.account.toLowerCase() })
    return allAccounts.trades
  }),
  awaitPromises
)


export const requestLatestPriceMap = O(
  map(async (queryParams: IChainParamApi): Promise<IPriceLatestMap> => {
    const priceList = await graphMap[queryParams.chain](latestPriceTimelineQuery, {}, { requestPolicy: 'network-only' })
    const gmap = groupByMap(priceList.priceLatests.map(fromJson.priceLatestJson), price => price.id)
    return gmap
  }),
  awaitPromises
)


export const lightningLatestPricesMap = replayLatest(multicast(merge(
  combine(
    (ap, bp) => ({ ...ap, ...bp }),
    requestLatestPriceMap(constant({ chain: CHAIN.ARBITRUM }, periodic(15000))),
    requestLatestPriceMap(constant({ chain: CHAIN.AVALANCHE }, periodic(15000)))
  ),
  combine(
    (ap, bp) => ({ ...ap, ...bp }),
    requestLatestPriceMap(now({ chain: CHAIN.ARBITRUM })),
    requestLatestPriceMap(now({ chain: CHAIN.AVALANCHE }))
  )
)))


export const requestOpenTrades = O(
  snapshot(async (feedMap, queryParams: IOpenTradesParamApi) => {
    const query = createCache('requestOpenTrades' + queryParams.chain, intervalInMsMap.MIN5, async () => {
      const list = await  fetchTrades(tradeOpenListQuery, { offset: 0, pageSize: 1000 }, queryParams.chain, 0, res => res.trades)
      return list.map(tradeJson => {
        const trade = fromJson.toTradeJson(tradeJson)
        const marketPrice = feedMap[trade.indexToken].value
        const { delta, deltaPercentage } = calculatePositionDelta(marketPrice, trade.averagePrice, trade.isLong, trade)

        return { ...trade, realisedPnl: delta, realisedPnlPercentage: deltaPercentage }
      })
    })

    return pagingQuery(queryParams, query)
  }, lightningLatestPricesMap),
  awaitPromises
)

export const requestTrade = O(
  map(async (queryParams: IRequestTradeQueryparam) => {
    const id = queryParams.id
    const priceFeedQuery = await graphMap[queryParams.chain](tradeQuery, { id })

    if (priceFeedQuery === null) {
      throw new Error('Trade not found')
    }

    return priceFeedQuery.trade
  }),
  awaitPromises
)


export const requestPricefeed = O(
  map(async (queryParams: IPricefeedParamApi) => {
    const tokenAddress = '_' + queryParams.tokenAddress
    const parsedTo = queryParams.to || unixTimestampNow()
    const params = { tokenAddress, interval: '_' + queryParams.interval, from: queryParams.from, to: parsedTo }

    const priceFeedQuery = await graphMap[queryParams.chain](pricefeed, params as any)

    return priceFeedQuery.pricefeeds
  }),
  awaitPromises
)





