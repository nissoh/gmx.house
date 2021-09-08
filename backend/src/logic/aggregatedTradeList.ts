
import { awaitPromises, loop, map } from '@most/core'
import { HistoricalDataApi, intervalInMsMap, LeaderboardApi, AccountHistoricalDataApi, IQueryAggregatedTradeMap, toAggregatedAccountSummary, IAggregatedAccountSummary } from 'gambit-middleware'
import { timespanPassedSinceInvoke } from '../utils'
import { O } from '@aelea/utils'
import { createClient, gql, OperationResult } from '@urql/core'
import fetch from 'isomorphic-fetch'


const aggregatedOpenTrades = gql`
query {
  aggregatedTradeOpens {
    id
    initialPosition {
      account
      isLong
      collateralDelta
      id
    }
    increaseList {
      fee
      id
    }
    decreaseList {
      fee
      id
    }
    updateList {
      key
      id
    }
  }
}

`


const aggregatedTradesMap = gql`



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

fragment updatePositionFields on UpdatePosition {
  key
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
  key
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

query ($account: String = "0xba9366ce37aa833eab8f12d599977a16e470e34e", $timeStart: BigDecimal = 0, $timeEnd: BigDecimal = 9e10) {
  aggregatedTradeOpens(first: 1000, where: {account_starts_with: $account}) {
    id
    account
    initialPosition {
      ...increasePositionFields
    }
    increaseList {
      ...increasePositionFields
    }
    decreaseList {
      ...decreasePositionFields
    }
    # updateList {
    #   ...updatePositionFields
    # }
  }
  aggregatedTradeCloseds(first: 1000, where: {account_starts_with: $account, settledBlockTimestamp_gt: $timeStart, settledBlockTimestamp_lt: $timeEnd}) {
    id
    initialPositionBlockTimestamp
    account
    initialPosition {
      ...increasePositionFields
    }
    settledBlockTimestamp
    settledPosition {
      ...closePositionFields
    }
    increaseList {
      ...increasePositionFields
    }
    decreaseList {
      ...decreasePositionFields
    }
    # updateList {
    #   ...updatePositionFields
    # }
  }
  aggregatedTradeLiquidateds(first: 1000, where: {account_starts_with: $account, initialPositionBlockTimestamp_gt: $timeStart, settledBlockTimestamp_lt: $timeEnd}) {
    id
    account
    initialPositionBlockTimestamp
    initialPosition {
      ...increasePositionFields
    }
    settledBlockTimestamp
    settledPosition {
      ...liquidatePositionFields
    }
    initialPosition {
      ...increasePositionFields
    }
    increaseList {
      ...increasePositionFields
    }
    decreaseList {
      ...decreasePositionFields
    }
    # updateList {
    #   ...updatePositionFields
    # }
  }
}




`


const client = createClient({
  fetch: fetch as any,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault',
})




function getTimespanParams(params: HistoricalDataApi) {
  if (params.timeRange) {
    const [start, end] = params.timeRange
    const startDate = new Date(start)
    const endDate = new Date(end)

    return { $gt: startDate, $lt: endDate, }
  }

  return {}
}



export const aggregatedTradeSettled = O(
  map(async (queryParams: AccountHistoricalDataApi) => {
    const allAccounts = await getAggratedSettledTrades(queryParams)

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

    const allAccounts = getAggratedSettledTrades({ ...queryParams }).then(toAggregatedAccountSummary)
  
    seed.cache = allAccounts

    return {
      seed,
      value: allAccounts
    }

  }, { cache: Promise.resolve([]) as Promise<IAggregatedAccountSummary[]>, cacheAgeFn: timespanPassedSinceInvoke(intervalInMsMap.MIN15) }),
  awaitPromises
)

export const openTrades = O(
  map(async (queryParams: LeaderboardApi) => {

    const allAccounts = await getAggratedSettledTrades(queryParams)

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

async function getAggratedSettledTrades(
  params: AccountHistoricalDataApi | LeaderboardApi
): Promise<IQueryAggregatedTradeMap> {

  const [timeStart = 0, timeEnd = Infinity] = params.timeRange || []
  const account = 'account' in params ? params.account : ''

  const data = client.query(aggregatedTradesMap, { timeStart: timeStart / 1000, timeEnd: timeEnd / 1000, account: account ?? '' }).toPromise().then((res: OperationResult<IQueryAggregatedTradeMap>) => {
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



