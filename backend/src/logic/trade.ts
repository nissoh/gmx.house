
import { O, replayLatest } from '@aelea/core'
import { awaitPromises, combine, constant, map, merge, multicast, now, periodic, snapshot } from '@most/core'
import {
  calculatePositionDelta, fromJson, ILeaderboardRequest,
  intervalInMsMap, IPricefeedParamApi, IRequestTradeQueryparam,
  pagingQuery, toAccountSummary, IOpenTradesParamApi, unixTimestampNow, CHAIN, IChainParamApi, IPriceLatestMap, groupByMap
} from '@gambitdao/gmx-middleware'
import { fetchHistoricTrades, graphMap, fetchTrades, globalCache } from './api'
import { tradeQuery, accountTradeListQuery, IAccountTradeListParamApi, latestPriceTimelineQuery, pricefeed, tradeSettledListQuery, tradeOpenListQuery } from './queries'




const cacheLifeMap = {
  [intervalInMsMap.HR24]: intervalInMsMap.MIN5,
  [intervalInMsMap.DAY7]: intervalInMsMap.MIN30,
  [intervalInMsMap.MONTH]: intervalInMsMap.MIN60,
}

export const requestLeaderboardTopList = O(
  map(async (queryParams: ILeaderboardRequest) => {
    const cacheLife = cacheLifeMap[queryParams.timeInterval]
    const cacheKey = 'requestLeaderboardTopList' + queryParams.timeInterval + queryParams.chain

    const list = globalCache(cacheKey, cacheLife, async () => {
      const timeNow = unixTimestampNow()
      const from = timeNow - queryParams.timeInterval

      const tradeList = await fetchHistoricTrades(tradeSettledListQuery, { from, to: timeNow, offset: 0, pageSize: 1000 }, queryParams.chain, 0, res => res.trades)
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
    const allAccounts = await graphMap[queryParams.chain](accountTradeListQuery, { ...queryParams, account: queryParams.account.toLowerCase() }, { requestPolicy: 'network-only' })
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
    const query = globalCache('requestOpenTrades' + queryParams.chain, intervalInMsMap.MIN5, async () => {
      const list = await fetchTrades(tradeOpenListQuery, { offset: 0, pageSize: 1000 }, queryParams.chain, 0, res => res.trades)
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
    const priceFeedQuery = await graphMap[queryParams.chain](tradeQuery, { id }, { requestPolicy: 'network-only' })

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




