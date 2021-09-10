
import { awaitPromises, loop, map } from '@most/core'
import { intervalInMsMap, LeaderboardApi, AccountHistoricalDataApi, IAccountAggregationMap, IAggregatedTradeListMap, toAggregatedAccountSummary, IAggregatedAccountSummary, IAggregatedTradeOpen } from 'gambit-middleware'
import { timespanPassedSinceInvoke } from '../utils'
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
  initialPosition

  settledBlockTimestamp
  settledPosition {
    ...closePositionFields
  }

  settledPosition { ...closePositionFields }
  initialPosition { ...increasePositionFields }
  settledPosition { ...closePositionFields }
  increaseList { ...increasePositionFields }
  decreaseList { ...decreasePositionFields }
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
      settledPosition { ...liquidatePositionFields }
    }
    aggregatedTradeOpens {
      initialPosition { ...increasePositionFields }
    }
  }
}

`
const openAggregateTradesQuery = gql`
${schemaFragments}

query ($account: ID = "", $timeStart: BigDecimal = 0, $timeEnd: BigDecimal = 9e10) {
  aggregatedTradeOpens {
    ...aggregatedTradeOpenFields
  }
}



`




const aggregatedTradesMapQuery = gql`
${schemaFragments}

query ($account: String = "0xba9366ce37aa833eab8f12d599977a16e470e34e", $timeStart: BigDecimal = 0, $timeEnd: BigDecimal = 9e10) {
  aggregatedTradeOpens(first: 1000, where: {account_starts_with: $account}) {
    ...aggregatedTradeOpenFields
  }
  aggregatedTradeCloseds(first: 1000, where: {account_starts_with: $account, settledBlockTimestamp_gt: $timeStart, settledBlockTimestamp_lt: $timeEnd}) {
      ...aggregatedTradeClosedFields
  }
  aggregatedTradeLiquidateds(first: 1000, where: {account_starts_with: $account, initialPositionBlockTimestamp_gt: $timeStart, settledBlockTimestamp_lt: $timeEnd}) {
    ...aggregatedTradeLiquidatedFields
  }
}


`


const client = createClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault',
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

export const requestAggregatedTradeList = O(
  map(async (queryParams: AccountHistoricalDataApi) => {

    const [timeStart = 0, timeEnd = Infinity] = queryParams.timeRange || []
    const account = 'account' in queryParams ? queryParams.account : ''
    const params = { timeStart: timeStart / 1000, timeEnd: timeEnd / 1000, account: account ?? '' }

    const allAccounts = queryGraph(aggregatedTradesMapQuery, params).then(toAggregatedAccountSummary)

    return allAccounts
  }),
  awaitPromises
)

export const leaderboard = O(
  loop((seed, queryParams: LeaderboardApi) => {

    // const cacheTimespanPasses = seed.cacheAgeFn()

    // if (!cacheTimespanPasses) {
    //   return { seed, value: seed.cache }
    // }

    const allAccounts = queryGraph(aggregatedTradesMapQuery, { ...queryParams }).then(toAggregatedAccountSummary)
  
    seed.cache = allAccounts

    return {
      seed,
      value: allAccounts
    }

  }, { cache: Promise.resolve([]) as Promise<IAggregatedAccountSummary[]>, cacheAgeFn: timespanPassedSinceInvoke(intervalInMsMap.MIN15) }),
  awaitPromises
)

export const requestOpenAggregatedTrades = O(
  map(async (queryParams: LeaderboardApi): Promise<IAggregatedTradeOpen[]> => {

    const allAccounts = await queryGraph(openAggregateTradesQuery, queryParams)

    return allAccounts
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



