
import { O } from '@aelea/core'
import { awaitPromises, map } from '@most/core'
import { gql, TypedDocumentNode } from '@urql/core'
import { AccountHistoricalDataApi, formatFixed, fromJson, IAccountAggregationMap, IAccountQueryParamApi, IAggregatedTradeAll, IAggregatedTradeClosed, IAggregatedTradeLiquidated, IAggregatedTradeOpen, IAggregatedTradeOpenListMap, IAggregatedTradeSettledListMap, IChainlinkPrice, IIdentifiableEntity, ILeaderboardRequest, intervalInMsMap, IPageable, IPageChainlinkPricefeed, IRequestAggregatedTradeQueryparam, ITimerange, pageableQuery, toAggregatedAccountSummary, TradeType } from 'gambit-middleware'
import fetch from 'isomorphic-fetch'
import { cacheMap } from '../utils'
import { prepareClient } from './common'


const schemaFragments = `

fragment increasePositionFields on IncreasePosition {
  id
  account

  indexedAt

  collateralToken
  indexToken
  key
  isLong
  collateralDelta
  sizeDelta
  price
  fee
}

fragment decreasePositionFields on DecreasePosition {
  id
  indexedAt

  account
  collateralToken
  indexToken
  isLong
  collateralDelta
  sizeDelta
  price
  fee
}

fragment updatePositionFields on UpdatePosition {
  id

  indexedAt
  size
  collateral
  reserveAmount
  realisedPnl
  averagePrice
  entryFundingRate
}

fragment closePositionFields on ClosePosition {
  id

  indexedAt

  size
  collateral
  reserveAmount
  realisedPnl
  averagePrice
  entryFundingRate
}

fragment liquidatePositionFields on LiquidatePosition {
  id

  indexedAt

  account
  collateralToken
  indexToken
  isLong
  size
  collateral
  reserveAmount
  realisedPnl
  markPrice
}

fragment aggregatedTradeClosedFields on AggregatedTradeClosed {
  id
  indexedAt

  account

  indexedAt

  initialPositionBlockTimestamp
  initialPosition { ...increasePositionFields }

  settledPosition {
    ...closePositionFields
  }

  settledPosition { ...closePositionFields }
  initialPosition { ...increasePositionFields }
  settledPosition { ...closePositionFields }
  increaseList { ...increasePositionFields }
  decreaseList { ...decreasePositionFields }
  updateList { ...updatePositionFields }
}

fragment aggregatedTradeLiquidatedFields on AggregatedTradeLiquidated {
  id
  indexedAt

  account

  initialPositionBlockTimestamp
  initialPosition { ...increasePositionFields }

  settledPosition { ...liquidatePositionFields }
  initialPosition { ...increasePositionFields }
  increaseList { ...increasePositionFields }
  decreaseList { ...decreasePositionFields }
  updateList { ...updatePositionFields }
}

fragment aggregatedTradeOpenFields on AggregatedTradeOpen {
  id
  indexedAt

  account

  initialPosition { ...increasePositionFields }
  increaseList { ...increasePositionFields }
  decreaseList { ...decreasePositionFields }
  updateList { ...updatePositionFields }
}

fragment accountAggregationFields on AccountAggregation {
  id
  indexedAt
  
  totalRealisedPnl

  aggregatedTradeCloseds {
    ...aggregatedTradeClosedFields
  }
  aggregatedTradeLiquidateds {
    ...aggregatedTradeLiquidatedFields
  }
  aggregatedTradeOpens {
    ...aggregatedTradeOpenFields
  }
}

`

const accountAggregationQuery: TypedDocumentNode<{accountAggregation: IAccountAggregationMap}, IPageable & ITimerange & IAccountQueryParamApi> = gql`
${schemaFragments}

query ($account: ID, $from: Int = 0, $to: Int = 9e10,  $offset: Int = 0, $pageSize: Int = 1000) {
  accountAggregation(id: $account) {
    ...accountAggregationFields
  }
}

`

const accountListAggregationQuery: TypedDocumentNode<{ accountAggregations: IAccountAggregationMap[] }, IPageable & ITimerange> = gql`
${schemaFragments}

query ($from: Int = 0, $to: Int = 9e10, $offset: Int = 0, $pageSize: Int = 1000, $orderBy: AccountAggregation_orderBy = totalRealisedPnl, $orderDirection: OrderDirection = desc) {
  accountAggregations(first: $pageSize, skip: $offset, orderBy: $orderBy, orderDirection: $orderDirection) {
    ...accountAggregationFields
  }
}
`

const openAggregateTradesQuery: TypedDocumentNode<IAggregatedTradeOpenListMap> = gql`
${schemaFragments}

query {
  aggregatedTradeOpens(first: 1000) {
    ...aggregatedTradeOpenFields
  }
}
`

const aggregatedSettledTradesMapQuery: TypedDocumentNode<IAggregatedTradeSettledListMap, IPageable & ITimerange> = gql`
${schemaFragments}

query ($pageSize: Int, $offset: Int = 0, $from: Int = 0, $to: Int = 9e10) {
  aggregatedTradeCloseds(first: 1000, skip: $offset, where: {indexedAt_gt: $from, indexedAt_lt: $to}) {
      ...aggregatedTradeClosedFields
  }
  aggregatedTradeLiquidateds(first: 1000, where: {indexedAt_gt: $from, indexedAt_lt: $to}) {
    ...aggregatedTradeLiquidatedFields
  }
}
`

const openAggregateLiquidatedTradeQuery: TypedDocumentNode<{aggregatedTradeLiquidated: IAggregatedTradeLiquidated}, IIdentifiableEntity> = gql`
${schemaFragments}

query ($id: String) {
  aggregatedTradeLiquidated(id: $id) {
    ...aggregatedTradeLiquidatedFields
  }
}
`

const openAggregateOpenTradeQuery: TypedDocumentNode<{aggregatedTradeOpen: IAggregatedTradeOpen}, IIdentifiableEntity> = gql`
${schemaFragments}

query ($id: String) {
  aggregatedTradeOpen(id: $id) {
    ...aggregatedTradeOpenFields
  }
}
`

const aggregatedClosedTradeQuery: TypedDocumentNode<{aggregatedTradeClosed: IAggregatedTradeClosed}, IIdentifiableEntity> = gql`
${schemaFragments}

query ($id: String) {
  aggregatedTradeClosed(id: $id) {
      ...aggregatedTradeClosedFields
  }
}
`

const chainlinkPricefeedQuery: TypedDocumentNode<{rounds: IChainlinkPrice[]}, IPageChainlinkPricefeed> = gql`

query ($feedAddress: String, $from: Int, $to: Int, $offset: Int = 0, $orderDirection: OrderDirection = asc, $orderBy: Round_orderBy = unixTimestamp) {
  rounds(first: 1000, skip: $offset, orderBy: $orderBy, orderDirection: $orderDirection, where: { feed: $feedAddress, unixTimestamp_gte: $from, unixTimestamp_lte: $to }) {
    unixTimestamp,
    value
  }
}

`



const vaultClient = prepareClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault',
  requestPolicy: 'network-only'
})


const chainlinkClient = prepareClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/deividask/chainlink',
  requestPolicy: 'network-only'
})




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
  map(async (queryParams: AccountHistoricalDataApi) => {
    const to = Date.now() / 1000 | 0
    const from = (to - (queryParams.timeInterval / 1000 | 0))

    const allAccounts = await vaultClient(aggregatedSettledTradesMapQuery, { from, to, offset: 0, pageSize: 1000 })
    
    return toAggregatedAccountSummary([...allAccounts.aggregatedTradeCloseds, ...allAccounts.aggregatedTradeLiquidateds])
  }),
  awaitPromises
)

const cacheLifeMap = {
  [intervalInMsMap.HR24]: intervalInMsMap.SEC60,
  [intervalInMsMap.DAY7]: intervalInMsMap.MIN15,
  [intervalInMsMap.MONTH]: intervalInMsMap.MIN60,
}
const leaderboardCacheMap = cacheMap({})
export const requestLeaderboardTopList = O(
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

    const cacheLife = cacheLifeMap[queryParams.timeInterval]
    const cacheQuery = leaderboardCacheMap(queryParams.timeInterval.toString(), cacheLife, async () => {
      const list = await fethPage(0)
      const formattedList = [...list.aggregatedTradeCloseds, ...list.aggregatedTradeLiquidateds].map(fromJson.toAggregatedSettledTrade)
      const summary = toAggregatedAccountSummary(formattedList)

      return summary
    })
    

    return pageableQuery(queryParams, cacheQuery)
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

const openTradesCacheMap = cacheMap({})
export const requestOpenAggregatedTrades = O(
  map(async (queryParams: IPageable) => {

    const cacheQuery = openTradesCacheMap('open', intervalInMsMap.SEC60, async () => {
      const list = await vaultClient(openAggregateTradesQuery, {})
      const sortedList = list.aggregatedTradeOpens
        // .filter(a => a.account == '0x04d52e150e49c1bbc9ddde258060a3bf28d9fd70')
        .map(fromJson.toAggregatedOpenTradeSummary).sort((a, b) => formatFixed(b.size) - formatFixed(a.size))
      return sortedList
    })

    const query = await pageableQuery(queryParams, cacheQuery)
    
    return { ...query, page: query.page }
  }),
  awaitPromises
)

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

export const requestAggregatedLiquidatedTrade = O(
  map(async (queryParams: IRequestAggregatedTradeQueryparam) => {
    const id = queryParams.id
    const priceFeedQuery = await vaultClient(openAggregateLiquidatedTradeQuery, { id })

    return priceFeedQuery.aggregatedTradeLiquidated
  }),
  awaitPromises
)

export const requestAggregatedClosedTrade = O(
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




