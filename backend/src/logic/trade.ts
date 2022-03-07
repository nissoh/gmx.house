
import { O, replayLatest } from '@aelea/core'
import { awaitPromises, combine, constant, map, merge, multicast, now, periodic, snapshot } from '@most/core'
import {
  calculatePositionDelta, fromJson, ITrade, ILeaderboardRequest,
  intervalInMsMap, IPagePositionParamApi, IPricefeedParamApi, IRequestTradeQueryparam,
  ITimerangeParamApi, pagingQuery, toAccountSummary, IOpenTradesParamApi, TradeStatus, unixTimestampNow, CHAIN, IChainParamApi, IPriceLatestMap, groupByMap } from '@gambitdao/gmx-middleware'
import { cacheMap } from '../utils'
import { graphMap } from './api'
import { tradeQuery, tradeListQuery, accountTradeListQuery, IAccountTradeListParamApi, latestPriceTimelineQuery, pricefeed } from './queries'

const createCache = cacheMap({})

const fetchTrades = async (chain: CHAIN.ARBITRUM | CHAIN.AVALANCHE, offset: number, from: number, to: number): Promise<ITrade[]> => {
  const deltaTime = to - from


  // splits the queries because the-graph's result limit of 5k items
  if (deltaTime >= intervalInMsMap.DAY7) {
    const splitDelta = deltaTime / 2
    const query0 = fetchTrades(chain, 0, from, to - splitDelta).then(list => list.map(fromJson.toTradeJson))
    const query1 = fetchTrades(chain, 0, from + splitDelta, to).then(list => list.map(fromJson.toTradeJson))

    return (await Promise.all([query0, query1])).flatMap(res => res)
  }

  const list = (await graphMap[chain](tradeListQuery, { from, to, pageSize: 1000, offset })).trades

  if (list.length === 1000) {
    const newPage = await fetchTrades(chain, offset + 1000, from, to)

    return [...list, ...newPage]
  }

  return list
}



export const tradeByTimespan = map((queryParams: IChainParamApi & IPagePositionParamApi & ITimerangeParamApi) => {
  const query = createCache('tradeByTimespan' + queryParams.from, intervalInMsMap.MIN5, async () => {
    const from = Math.floor(queryParams.from)
    const to = Math.min(unixTimestampNow(), queryParams.to)
    
    return fetchTrades(queryParams.chain, 0, from, to) 
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

    const to = await createCache(cacheKey, cacheLife, async () => {
      return unixTimestampNow()
    })

    const from = to - queryParams.timeInterval

    const cacheQuery = fetchTrades(queryParams.chain, 0, from, to).then(list => {
      const formattedList = list.map(fromJson.toTradeJson)
      console.log('fetches new ', formattedList.length, ' items')

      const summary = toAccountSummary(formattedList)

      return summary
    })


 
    return pagingQuery(queryParams, cacheQuery)
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
    const priceList = await graphMap[queryParams.chain](latestPriceTimelineQuery, {})
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
    const to = await createCache('requestOpenTrades' + queryParams.chain, intervalInMsMap.MIN5, async () => unixTimestampNow())
    const cacheQuery = graphMap[queryParams.chain](tradeListQuery, { to: 1999999999, pageSize: 1000, status: TradeStatus.OPEN })

    const queryResults = cacheQuery.then(resp => resp.trades.map(tradeJson => {
      const trade = fromJson.toTradeJson(tradeJson)
      const marketPrice = feedMap[trade.indexToken].value
      const { delta, deltaPercentage } = calculatePositionDelta(marketPrice, trade.averagePrice, trade.isLong, trade)

      return { ...trade, realisedPnl: delta, realisedPnlPercentage: deltaPercentage }
    }))

    return pagingQuery(queryParams, queryResults)
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

    return priceFeedQuery.pricefeeds.reverse()
  }),
  awaitPromises
)





