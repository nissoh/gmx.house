
import { awaitPromises, map } from '@most/core'
import {
  intervalInMsMap, ILeaderboardRequest, AccountHistoricalDataApi,
  IAccountAggregationMap, toAggregatedAccountSummary, pageableQuery,
  IPageable, toAggregatedOpenTradeSummary, formatFixed, IPageChainlinkPricefeed,
  IAggregatedTradeSettledListMap, ITimerange, IAccountQueryParamApi,
  IChainlinkPrice, IAggregatedTradeOpenListMap, IAggregatedTradeClosed, IIdentifiableEntity
} from 'gambit-middleware'
import { cacheMap } from '../utils'
import { O } from '@aelea/utils'
import { gql, TypedDocumentNode } from '@urql/core'
import fetch from 'isomorphic-fetch'
import { prepareClient } from './common'


const schemaFragments = `

fragment increasePositionFields on IncreasePosition {
  account
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
  # key

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
  # key
  size
  collateral
  reserveAmount
  realisedPnl
  averagePrice
  entryFundingRate
}

fragment closePositionFields on ClosePosition {
  # key
  size
  collateral
  reserveAmount
  realisedPnl
  averagePrice
  entryFundingRate
}

fragment liquidatePositionFields on LiquidatePosition {
  # key
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

const aggregatedClosedTradeQuery: TypedDocumentNode<{aggregatedTradeClosed: IAggregatedTradeClosed}, IIdentifiableEntity> = gql`
${schemaFragments}

query ($id: String) {
  aggregatedTradeClosed(id: $id) {
      ...aggregatedTradeClosedFields
  }
}
`

const chainlinkPricefeedQuery: TypedDocumentNode<{rounds: IChainlinkPrice[]}, IPageChainlinkPricefeed> = gql`

query ($feedAddress: String, $offset: Int = 0, $orderDirection: OrderDirection = desc, $orderBy: Round_orderBy = unixTimestamp) {
  rounds(first: 1000, skip: $offset, orderBy: $orderBy, orderDirection: $orderDirection, where: { feed: $feedAddress }) {
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

    const now = Date.now()
    const start = now - queryParams.timeInterval
    const from = Math.floor(start / 1000)
    const to = Math.floor(Date.now() / 1000)
    const account = queryParams.account
    
    const data = await vaultClient(accountAggregationQuery, { from, to, account, offset: 0, pageSize: 1000 })
    return data.accountAggregation
  }),
  awaitPromises
)

export const requestAggregatedSettledTradeList = O(
  map(async (queryParams: AccountHistoricalDataApi) => {
    const now = Date.now()

    const from = Math.floor(now - queryParams.timeInterval / 1000)
    const to = Math.floor(Date.now() / 1000)

    const allAccounts = await vaultClient(aggregatedSettledTradesMapQuery, { from, to, offset: 0, pageSize: 1000 })
    
    return toAggregatedAccountSummary(allAccounts)
  }),
  awaitPromises
)


const leaderboardCacheMap = cacheMap({})
export const requestLeaderboardTopList = O(
  map((queryParams: ILeaderboardRequest) => {
    const now = Date.now()

    const timeStart = now - queryParams.timeInterval
    const from = Math.floor(timeStart / 1000)
    const to = Math.floor(now / 1000)
    

    const fethPage = async (offset: number): Promise<IAggregatedTradeSettledListMap> => {
      const list = await vaultClient(aggregatedSettledTradesMapQuery, { from, to, pageSize: 1000, offset })

      if (list.aggregatedTradeCloseds.length === 1000) {
        const newPage = await fethPage(offset + 1000)

        return { aggregatedTradeLiquidateds: list.aggregatedTradeLiquidateds, aggregatedTradeCloseds: [...list.aggregatedTradeCloseds, ...newPage.aggregatedTradeCloseds] }
      }

      return list
    }

    const cacheLife = queryParams.timeInterval > intervalInMsMap.DAY ? intervalInMsMap.MIN15 : intervalInMsMap.MIN
    const cacheQuery = leaderboardCacheMap(queryParams.timeInterval.toString(), cacheLife, async () => {
      const list = await fethPage(0)
      const summary = toAggregatedAccountSummary(list)

      return summary
    })
    

    return pageableQuery(queryParams, cacheQuery)
  }),
  awaitPromises
)

export const requestAccountListAggregation = O(
  map(async (queryParams: ILeaderboardRequest) => {

    const now = Date.now()

    const timeStart = now - queryParams.timeInterval
    const from = Math.floor(timeStart / 1000)
    const to = Math.floor(now / 1000)

    const allAccounts = await vaultClient(accountListAggregationQuery, { from, to, offset: 0, pageSize: 1000 })

    return allAccounts.accountAggregations
  }),
  awaitPromises
)

const openTradesCacheMap = cacheMap({})
export const requestOpenAggregatedTrades = O(
  map(async (queryParams: IPageable) => {

    const cacheQuery = openTradesCacheMap('open', intervalInMsMap.MIN, async () => {
      console.log('fetching open positions')
      const list = await vaultClient(openAggregateTradesQuery, {})
      const sortedList = list.aggregatedTradeOpens
        // .filter(a => a.account == '0x04d52e150e49c1bbc9ddde258060a3bf28d9fd70')
        .map(toAggregatedOpenTradeSummary).sort((a, b) => formatFixed(b.size) - formatFixed(a.size))
      return sortedList
    })

    const query = await pageableQuery(queryParams, cacheQuery)

    
    
    return { ...query, page: query.page }
  }),
  awaitPromises
)



export const requestChainlinkPricefeed = O(
  map(async (queryParams: IPageChainlinkPricefeed) => {
    console.log(queryParams)

    const priceFeedQuery = await chainlinkClient(chainlinkPricefeedQuery, queryParams)

    return priceFeedQuery.rounds
  }),
  awaitPromises
)



export const requestAggregatedSettleTrade = O(
  map(async (queryParams: IIdentifiableEntity) => {

    const priceFeedQuery = await vaultClient(aggregatedClosedTradeQuery, queryParams)
    return priceFeedQuery.aggregatedTradeClosed
  }),
  awaitPromises
)




