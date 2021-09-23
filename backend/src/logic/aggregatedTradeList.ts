
import { awaitPromises, loop, map } from '@most/core'
import { intervalInMsMap, ILeaderboardRequest, AccountHistoricalDataApi, IAccountAggregationMap, IAggregatedTradeListMap, toAggregatedAccountSummary, IAggregatedAccountSummary, IAggregatedTradeOpen, pageableQuery, IPagableResponse, IPageable, toAggregatedOpenTradeSummary, formatFixed } from 'gambit-middleware'
import { cacheMap, timespanPassedSinceInvoke } from '../utils'
import { O } from '@aelea/utils'
import { createClient, gql, OperationResult, TypedDocumentNode } from '@urql/core'
import fetch from 'isomorphic-fetch'
import { DocumentNode } from 'graphql'


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

  initialPositionBlockTimestamp
  initialPosition { ...increasePositionFields }

  settledBlockTimestamp
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
  account
  initialPositionBlockTimestamp
  initialPosition { ...increasePositionFields }
  settledBlockTimestamp
  settledPosition { ...liquidatePositionFields }
  initialPosition { ...increasePositionFields }
  increaseList { ...increasePositionFields }
  decreaseList { ...decreasePositionFields }
  updateList { ...updatePositionFields }
}

fragment aggregatedTradeOpenFields on AggregatedTradeOpen {
  id
  account
  initialPosition { ...increasePositionFields }
  increaseList { ...increasePositionFields }
  decreaseList { ...decreasePositionFields }
  updateList { ...updatePositionFields }
}

`

const accountAggregationQuery = gql`
${schemaFragments}

query ($account: ID = "", $timeStart: BigDecimal = 0, $timeEnd: BigDecimal = 9e10) {
  accountAggregation(id: $account) {
    id
    totalRealisedPnl
    aggregatedTradeCloseds (where: {settledBlockTimestamp_gt: $timeStart, settledBlockTimestamp_lt: $timeEnd}) {
      ...aggregatedTradeClosedFields
    }
    aggregatedTradeLiquidateds (where: {settledBlockTimestamp_gt: $timeStart, settledBlockTimestamp_lt: $timeEnd}) {
      ...aggregatedTradeLiquidatedFields
    }
    aggregatedTradeOpens {
      ...aggregatedTradeOpenFields
    }
  }
}

`

const accountListAggregationQuery = gql`
${schemaFragments}

query ($timeStart: BigDecimal = 0, $timeEnd: BigDecimal = 9e10, $offset: Int = 20, $pageSize: Int = 20, $orderBy: AccountAggregation_orderBy = totalRealisedPnl, $orderDirection: OrderDirection = desc) {
  accountAggregations(first: $pageSize, skip: $offset, orderBy: $orderBy, orderDirection: $orderDirection) {
    id
    totalRealisedPnl
    aggregatedTradeCloseds (where: {settledBlockTimestamp_gt: $timeStart, settledBlockTimestamp_lt: $timeEnd}) {
      ...aggregatedTradeClosedFields
    }
    aggregatedTradeLiquidateds (where: {settledBlockTimestamp_gt: $timeStart, settledBlockTimestamp_lt: $timeEnd}) {
      ...aggregatedTradeLiquidatedFields
    }
    aggregatedTradeOpens {
      ...aggregatedTradeOpenFields
    }
  }
}
`

const openAggregateTradesQuery = gql`
${schemaFragments}

query {
  aggregatedTradeOpens(first: 1000) {
    ...aggregatedTradeOpenFields
  }
}
`


const aggregatedSettledTradesMapQuery = gql`
${schemaFragments}

query ($account: String = "0xba9366ce37aa833eab8f12d599977a16e470e34e", $timeStart: BigDecimal = 0, $timeEnd: BigDecimal = 9e10) {
  aggregatedTradeCloseds(first: 1000, where: {settledBlockTimestamp_gt: $timeStart, settledBlockTimestamp_lt: $timeEnd}) {
      ...aggregatedTradeClosedFields
  }
  aggregatedTradeLiquidateds(first: 1000, where: {initialPositionBlockTimestamp_gt: $timeStart, settledBlockTimestamp_lt: $timeEnd}) {
    ...aggregatedTradeLiquidatedFields
  }
}

`


const client = createClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault',
  requestPolicy: 'network-only'
})




export const requestAccountAggregation = O(
  map(async (queryParams: AccountHistoricalDataApi) => {
    
    const data = client.query(accountAggregationQuery, queryParams).toPromise()
      .then((res: OperationResult<IAccountAggregationMap>) => {
        if (res.data) {
          return res.data
        } else {
          return Promise.reject(`Unable to query data: ${res.error?.message}`)
        }
      })

    return data
  }),
  awaitPromises
)

export const requestAggregatedSettledTradeList = O(
  map(async (queryParams: AccountHistoricalDataApi) => {

    const [timeStart = 0, timeEnd = Infinity] = queryParams.timeRange || []
    const account = 'account' in queryParams ? queryParams.account : ''
    const params = { timeStart: timeStart / 1000, timeEnd: timeEnd / 1000, account: account ?? '' }

    const allAccounts = queryGraph(aggregatedSettledTradesMapQuery, params).then(toAggregatedAccountSummary)

    return allAccounts
  }),
  awaitPromises
)


const leaderboardCacheMap = cacheMap({})
export const requestLeaderboardTopList = O(
  map((queryParams: ILeaderboardRequest) => {
    const now = Date.now()

    const timeStart = now - queryParams.timeInterval
    const params = { timeStart: Math.floor(timeStart / 1000), timeEnd: Math.floor(now / 1000) }

    const cacheQuery = leaderboardCacheMap(queryParams.timeInterval.toString(), intervalInMsMap.MIN, async () => {
      const list = await queryGraph(aggregatedSettledTradesMapQuery, params)
      return toAggregatedAccountSummary(list)
    })

    return pageableQuery(queryParams, cacheQuery)
  }),
  awaitPromises
)

export const requestAccountListAggregation = O(
  loop((seed, queryParams: ILeaderboardRequest) => {

    // const cacheTimespanPasses = seed.cacheAgeFn()

    // if (!cacheTimespanPasses) {
    //   return { seed, value: seed.cache }
    // }

    const allAccounts = queryGraph(accountListAggregationQuery, queryParams).then(res => {
      return toAggregatedAccountSummary(res.accountAggregations)
    })
  
    seed.cache = allAccounts

    return {
      seed,
      value: allAccounts
    }

  }, { cache: Promise.resolve([]) as Promise<IAggregatedAccountSummary[]>, cacheAgeFn: timespanPassedSinceInvoke(intervalInMsMap.MIN15) }),
  awaitPromises
)

let www: any = null
const openTradesCacheMap = cacheMap({})
export const requestOpenAggregatedTrades = O(
  map(async (queryParams: IPageable) => {

    const cacheQuery = openTradesCacheMap('open', intervalInMsMap.MIN, async () => {
      console.log('fetching open positions')
      const list = await queryGraph(openAggregateTradesQuery, {})
      const sortedList = (list.aggregatedTradeOpens as IAggregatedTradeOpen[]).map(toAggregatedOpenTradeSummary).sort((a, b) => formatFixed(b.size) - formatFixed(a.size))
      return sortedList
    })

    console.log(www === cacheQuery)

    www = cacheQuery

    const query = pageableQuery(queryParams, cacheQuery)

    
    
    return query
  }),
  awaitPromises
)


// export const tournament = O(
//   loop((seed, s: string) => {

//     const cacheTimespanPasses = seed.cacheAgeFn()

//     if (!cacheTimespanPasses) {
//       return { seed, value: seed.cache }
//     }

//     const start = Date.UTC(2021, 5, 14, 12, 0, 0, 0)
//     const end = Date.UTC(2021, 5, 30, 12, 0, 0, 0)
//     const allAccounts = getAggratedSettledTrades({ timeRange: [start, end] })

//     seed.cache = allAccounts

//     return {
//       seed,
//       value: allAccounts
//     }
//   }, { cache: Promise.resolve([]) as Promise<AggregatedTradeSettled[]>, cacheAgeFn: timespanPassedSinceInvoke(intervalInMsMap.MIN15) }),
//   awaitPromises
// )

async function queryGraph<Data = any, Variables extends object = {}>(
  document: DocumentNode | TypedDocumentNode<Data, Variables> | string,
  params: Variables
) {

  const data = client.query(document, params)
    .toPromise()
    .then((res) => {
      if (res.data) {
        return res.data
      } else {
        return Promise.reject(`Unable to query data: ${res.error?.message}`)
      }
    })

  return data
}




// leaderboardApi.post('/liquidations', async (req, res) => {
//   const queryParams: HistoricalDataApi = req.body

//   const modelList = await EM.find(
//     dto.PositionLiquidated, {
//       createdAt: getTimespanParams(queryParams),
//     })
//   res.json(modelList)
// })



