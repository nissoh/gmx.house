
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

query($timeStart: BigDecimal, $timeEnd: BigDecimal) {
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

  aggregatedTradeCloseds(where: { initialPositionBlockTimestamp_gt: $timeStart, settledBlockTimestamp_lt: $timeEnd }) {
    id
    initialPositionBlockTimestamp
    
    initialPosition {
      account
      isLong
      collateralDelta
      id
    }
    
    settledBlockTimestamp
    settledPosition {
      collateral
      realisedPnl
    }
    increaseList {
      fee
      id
      sizeDelta
      collateralDelta
    }
    decreaseList {
      fee
      id
      sizeDelta
      collateralDelta
    }
    updateList {
      key
      id
    }
  }
  aggregatedTradeLiquidateds(where: { initialPositionBlockTimestamp_gt: $timeStart, settledBlockTimestamp_lt: $timeEnd }) {
    id
    
    initialPositionBlockTimestamp
    
    initialPosition {
      account
      isLong
      collateralDelta
      id
    }
    
    settledBlockTimestamp
    settledPosition {
      collateral
      realisedPnl
    }
    increaseList {
      fee
      id
      sizeDelta
      collateralDelta
    }
    decreaseList {
      fee
      id
      sizeDelta
      collateralDelta
    }
    updateList {
      key
      collateral
      id
    }
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
    const allAccounts = await getAggratedSettledTrades({})

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

    const allAccounts = getAggratedSettledTrades(queryParams).then(toAggregatedAccountSummary)
  
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

    const allAccounts = await getAggratedSettledTrades({})

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
  { timeRange }: HistoricalDataApi
): Promise<IQueryAggregatedTradeMap> {

  const [timeStart = 0, timeEnd = Infinity] = timeRange || []

  const data = client.query(aggregatedTradesMap, { timeStart: timeStart / 1000, timeEnd: timeEnd / 1000 }).toPromise().then((res: OperationResult<IQueryAggregatedTradeMap>) => {
    if (res.data) {
      return res.data
    } else {
      return Promise.reject('Unable to query data')
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



