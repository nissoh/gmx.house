
import { O } from '@aelea/core'
import { awaitPromises, map, snapshot } from '@most/core'
import { AccountHistoricalDataApi, calculatePositionDelta, fromJson, IAggregatedTradeAll, IAggregatedTradeSettledListMap, IChainlinkPrice, ILeaderboardRequest, indexTokenToName, intervalInMsMap, IPageable, IPageChainlinkPricefeed, IRequestAggregatedTradeQueryparam, ISortable, ITimerange, pagingQuery, parseFixed, toAggregatedAccountSummary, TradeType } from 'gambit-middleware'
import { cacheMap } from '../utils'
import { chainlinkClient, latestPricefeedMapSource, vaultClient } from './api'
import { accountAggregationQuery, accountListAggregationQuery, aggregatedClosedTradeQuery, aggregatedSettledTradesMapQuery, chainlinkPricefeedQuery, IChainLinkMap, openAggregateLiquidatedTradeQuery, openAggregateOpenTradeQuery, openAggregateTradesQuery, tradeListTimespanMapQuery } from './queries'

const createCache = cacheMap({})

export const requestChainlinkPricefeed = O(
  map(async (queryParams: IPageChainlinkPricefeed) => {
    const to = queryParams.to || Math.floor(Date.now() / 1000)

    const fethPage = async (offset: number): Promise<{ rounds: IChainlinkPrice[]; }> => {
      const list = await chainlinkClient(chainlinkPricefeedQuery, { ...queryParams, to, pageSize: 1000, offset })

      if (list.rounds.length === 1000) {
        const newPage = await fethPage(offset + 1000)

        return { rounds: [...list.rounds, ...newPage.rounds] }
      }

      return list
    }

    const priceFeedQuery = await fethPage(0)

    return priceFeedQuery.rounds
  }),
  awaitPromises
)

export const requestAccountAggregation = O(
  map(async (queryParams: AccountHistoricalDataApi) => {

    const to = Math.floor(Date.now() / 1000)
    const from = to - Math.floor(queryParams.timeInterval / 1000 | 0)
    const account = queryParams.account.toLocaleLowerCase()
    
    const data = await vaultClient(accountAggregationQuery, { from, to, account, offset: 0, pageSize: 1000 })
    return data.accountAggregation
  }),
  awaitPromises
)

export const requestAggregatedSettledTradeList = O(
  map((queryParams: ILeaderboardRequest) => {
    const to = Date.now() / 1000 | 0
    const from = (to - (queryParams.timeInterval / 1000 | 0))

    const fethPage = async (offset: number): Promise<IAggregatedTradeSettledListMap> => {
      const list = await vaultClient(aggregatedSettledTradesMapQuery, { from, to, pageSize: 1000, offset })

      if (list.aggregatedTradeCloseds.length === 1000) {
        const newPage = await fethPage(offset + 1000)

        return { aggregatedTradeLiquidateds: list.aggregatedTradeLiquidateds, aggregatedTradeCloseds: [...list.aggregatedTradeCloseds, ...newPage.aggregatedTradeCloseds] }
      }

      return list
    }

    const cacheQuery = fethPage(0).then(list => {
      const formattedList = [...list.aggregatedTradeCloseds, ...list.aggregatedTradeLiquidateds].map(fromJson.toAggregatedSettledTrade)
      return formattedList
    })
 
    return pagingQuery(queryParams, cacheQuery)
  }),
  awaitPromises
)

export const tradeByTimespan = map((queryParams: IPageable & ITimerange) => {
  const query = createCache('tradeByTimespan' + queryParams.from, intervalInMsMap.MIN5, async () => {
    const fethPage = async (offset: number): Promise<IAggregatedTradeSettledListMap> => {
      const from = Math.floor(queryParams.from / 1000)
      const to = Math.floor(queryParams.to / 1000)
    
      const list = await vaultClient(tradeListTimespanMapQuery, { from, to, pageSize: 1000, offset })

      if (list.aggregatedTradeCloseds.length === 1000) {
        const newPage = await fethPage(offset + 1000)
        return { aggregatedTradeLiquidateds: list.aggregatedTradeLiquidateds, aggregatedTradeCloseds: [...list.aggregatedTradeCloseds, ...newPage.aggregatedTradeCloseds] }
      }

      return list
    }
    
    return fethPage(0) 
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
    const to = await createCache('requestLeaderboardTopList' + queryParams.timeInterval, cacheLife, async () => {
      return Date.now() / 1000 | 0
    })

    const from = (to - (queryParams.timeInterval / 1000 | 0))

    const fethPage = async (offset: number): Promise<IAggregatedTradeSettledListMap> => {
      const list = await vaultClient(aggregatedSettledTradesMapQuery, { from, to, pageSize: 1000, offset })

      if (list.aggregatedTradeCloseds.length === 1000) {
        const newPage = await fethPage(offset + 1000)

        return { aggregatedTradeLiquidateds: list.aggregatedTradeLiquidateds, aggregatedTradeCloseds: [...list.aggregatedTradeCloseds, ...newPage.aggregatedTradeCloseds] }
      }

      return list
    }



    const cacheQuery = fethPage(0).then(list => {
      const formattedList = [...list.aggregatedTradeCloseds, ...list.aggregatedTradeLiquidateds].map(fromJson.toAggregatedSettledTrade)
      const summary = toAggregatedAccountSummary(formattedList)

      return summary
    })

 
    return pagingQuery(queryParams, cacheQuery)
  }),
  awaitPromises
)

export const requestAccountListAggregation = O(
  map(async (queryParams: ILeaderboardRequest) => {

    const to = Date.now() / 1000 | 0
    const from = (to - (queryParams.timeInterval / 1000 | 0))

    const allAccounts = await vaultClient(accountListAggregationQuery, { from, to, offset: 0, pageSize: 1000 })

    return allAccounts.accountAggregations
  }),
  awaitPromises
)

export const requestOpenAggregatedTrades = O(
  snapshot(async (feedMap, queryParams: IPageable & ISortable<'size' | 'delta' | 'deltaPercentage'>) => {
    const to = await createCache('requestOpenAggregatedTrades', intervalInMsMap.MIN5, async () => {
      return Date.now() / 1000 | 0
    })

    const cacheQuery = vaultClient(openAggregateTradesQuery, { to }).then(list => {
      const sortedList = list.aggregatedTradeOpens.map(fromJson.toAggregatedOpenTradeSummary)
      return sortedList
    })

    if (queryParams.sortBy === 'deltaPercentage' || queryParams.sortBy === 'delta') {
      const queryResults = cacheQuery.then(list => list.map(summary => {

        const key: keyof IChainLinkMap = indexTokenToName(summary.indexToken) as any
        const feed: IChainlinkPrice[] = feedMap[key]      
        const priceUsd = Number(feed[0].value) / 1e8
        const marketPrice = parseFixed(priceUsd, 30)

        const posDelta = calculatePositionDelta(marketPrice, summary.isLong, summary)

        return { ...summary, delta: posDelta.delta - summary.fee, deltaPercentage: posDelta.deltaPercentage }
      }))

      return pagingQuery(queryParams, queryResults)
    }
    
    return pagingQuery(queryParams, cacheQuery)
  }, latestPricefeedMapSource),
  awaitPromises
)


export const requestAggregatedLiquidatedTrade = O(
  map(async (queryParams: IRequestAggregatedTradeQueryparam) => {
    const id = queryParams.id
    const priceFeedQuery = await vaultClient(openAggregateLiquidatedTradeQuery, { id })

    return priceFeedQuery.aggregatedTradeLiquidated
  }),
  awaitPromises
)

export const requestAggregatedSettledTrade = O(
  map(async (queryParams: IRequestAggregatedTradeQueryparam) => {
    const id = queryParams.id
    const priceFeedQuery = await vaultClient(aggregatedClosedTradeQuery, { id })

    return priceFeedQuery.aggregatedTradeClosed
  }),
  awaitPromises
)

export const requestAggregatedOpenTrade = O(
  map(async (queryParams: IRequestAggregatedTradeQueryparam) => {
    const id = queryParams.id
    const priceFeedQuery = await vaultClient(openAggregateOpenTradeQuery, { id })

    return priceFeedQuery.aggregatedTradeOpen
  }),
  awaitPromises
)


const tradePrefixMap = {
  [TradeType.CLOSED]: 'AggregatedTradeClosed-',
  [TradeType.LIQUIDATED]: 'AggregatedTradeLiquidated-',
  [TradeType.OPEN]: '',
}
export const requestAggregatedTrade = O(
  map(async (queryParams: IRequestAggregatedTradeQueryparam): Promise<IAggregatedTradeAll> => {
    const id = tradePrefixMap[queryParams.tradeType] + queryParams.id

    if (queryParams.tradeType === TradeType.CLOSED) {
      const priceFeedQuery = await vaultClient(aggregatedClosedTradeQuery, { id })
      return priceFeedQuery.aggregatedTradeClosed
    } else if (queryParams.tradeType === TradeType.OPEN) {
      const priceFeedQuery = await vaultClient(openAggregateOpenTradeQuery, { id })
      return priceFeedQuery.aggregatedTradeOpen
    }
    
    const priceFeedQuery = await vaultClient(openAggregateLiquidatedTradeQuery, { id })
    return priceFeedQuery.aggregatedTradeLiquidated
  }),
  awaitPromises
)




