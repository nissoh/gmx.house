
import { EM } from '../server'
import { dto } from '../dto'
import { awaitPromises, loop, map } from '@most/core'
import { HistoricalDataApi, intervalInMsMap, LeaderboardApi, AccountHistoricalDataApi } from 'gambit-middleware'
import { AggregatedTradeSettled, AggregatedTrade } from '../dto/Vault'
import { timespanPassedSinceInvoke } from '../utils'
import { O } from '@aelea/utils'


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

    const aggTradeList = await EM.find(dto.AggregatedTradeSettled, {
      createdAt: getTimespanParams(queryParams),
      account: { $eq: queryParams.account }
    }, {
      populate: true
    })

    return aggTradeList
  }),
  awaitPromises
)

export const leaderboard = O(
  loop((seed, queryParams: LeaderboardApi) => {

    // const cacheTimespanPasses = seed.cacheAgeFn()

    // if (!cacheTimespanPasses) {
    //   return { seed, value: seed.cache }
    // }

    const allAccounts = getAggratedSettledTrades(queryParams)
  
    seed.cache = allAccounts

    return {
      seed,
      value: allAccounts
    }

  }, { cache: Promise.resolve([]) as Promise<AggregatedTradeSettled[]>, cacheAgeFn: timespanPassedSinceInvoke(intervalInMsMap.MIN15) }),
  awaitPromises
)

export const openTrades = O(
  map(async (queryParams: LeaderboardApi) => {

    const allAccounts = await getAggregatedTrades()

    return allAccounts
  }),
  awaitPromises
)


export const tournament = O(
  loop((seed, s: string) => {

    const cacheTimespanPasses = seed.cacheAgeFn()

    if (!cacheTimespanPasses) {
      return { seed, value: seed.cache }
    }

    const start = Date.UTC(2021, 5, 14, 12, 0, 0, 0)
    const end = Date.UTC(2021, 5, 30, 12, 0, 0, 0)
    const allAccounts = getAggratedSettledTrades({ timeRange: [start, end] })

    seed.cache = allAccounts

    return {
      seed,
      value: allAccounts
    }
  }, { cache: Promise.resolve([]) as Promise<AggregatedTradeSettled[]>, cacheAgeFn: timespanPassedSinceInvoke(intervalInMsMap.MIN15) }),
  awaitPromises
)

async function getAggratedSettledTrades({ timeRange }: HistoricalDataApi): Promise<AggregatedTradeSettled[]> {

  const aggTradeList = await EM.find(
    dto.AggregatedTradeSettled,
    {
      settledDate: getTimespanParams({ timeRange })
    },
    {
      populate: true
    }
  )

  return aggTradeList

}


async function getAggregatedTrades(): Promise<AggregatedTrade[]> {

  const aggTradeList = await EM.find(
    dto.AggregatedTrade,
    {
    },
    {
      populate: true
    }
  )


  return aggTradeList

}

// leaderboardApi.post('/liquidations', async (req, res) => {
//   const queryParams: HistoricalDataApi = req.body

//   const modelList = await EM.find(
//     dto.PositionLiquidated, {
//       createdAt: getTimespanParams(queryParams),
//     })
//   res.json(modelList)
// })



