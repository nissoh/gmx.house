import { O } from "@aelea/core"
import { awaitPromises, map } from "@most/core"
import { IAggregatedTradeSettledListMap, fromJson, pagingQuery, intervalInMsMap, IPageable, groupByMap, parseFixed, toAggregatedAccountSummary, BASIS_POINTS_DIVISOR } from "gambit-middleware"
import { cacheMap } from "../utils"
import { vaultClient } from "./api"
import { aggregatedSettledTradesMapQuery2 } from "./queries"
import { EM } from '../server'
import { Claim } from "./dto"

const leaderboardCacheMap = cacheMap({})

const from = Math.floor(Date.UTC(2021, 10, 3, 13, 0, 0) / 1000)
const to = Math.floor(Date.UTC(2021, 10, 16, 13, 0, 0) / 1000)

const fetchCompeitionResults = map((queryParams: IPageable) => {
  const fethPage = async (offset: number): Promise<IAggregatedTradeSettledListMap> => {
    const list = await vaultClient(aggregatedSettledTradesMapQuery2, { from, to, pageSize: 1000, offset })

    if (list.aggregatedTradeCloseds.length === 1000) {
      const newPage = await fethPage(offset + 1000)

      return { aggregatedTradeLiquidateds: list.aggregatedTradeLiquidateds, aggregatedTradeCloseds: [...list.aggregatedTradeCloseds, ...newPage.aggregatedTradeCloseds] }
    }

    return list
  }

  const query = leaderboardCacheMap('HIGH', intervalInMsMap.MIN5, async () => {
    const list = await fethPage(0)
    const claimList = await EM.find(Claim, {})
    const minWithThreshold = parseFixed(950, 30)

    
    const settledList = [...list.aggregatedTradeCloseds, ...list.aggregatedTradeLiquidateds]
      .map(fromJson.toAggregatedTradeSettledSummary)
      .filter(trade =>
        BigInt(trade.collateral) >= minWithThreshold
      ).map(s => s.trade)

    
    console.log(settledList.length)

    const formattedList = toAggregatedAccountSummary(settledList)
    
    const claimMap = groupByMap(claimList, item => item.account.toLowerCase())

    return { formattedList, claimMap }
  })
 
  return { query, queryParams }
})

const bigNumberForPriority = 1000000n

    
export const competitionNov2021HighestCumulative = O(
  fetchCompeitionResults,
  map(async ({ query, queryParams }) => {

    const claimPriority = query.then(res => 
      [...res.formattedList].sort((a, b) => {

        const aN = res.claimMap.get(a.account) ? bigNumberForPriority + a.delta.deltaPercentage : a.delta.deltaPercentage
        const bN = res.claimMap.get(b.account) ? bigNumberForPriority + b.delta.deltaPercentage : b.delta.deltaPercentage

        return Number(bN) - Number(aN)
      })
    )


    return pagingQuery(queryParams, claimPriority)
  }),
  awaitPromises
)

export const competitionNov2021LowestCumulative = O(
  fetchCompeitionResults,
  map(async ({ query, queryParams }) => {

    const claimPriority = query.then(res =>
      [...res.formattedList].sort((a, b) => {

        const aN = res.claimMap.get(a.account) ? bigNumberForPriority - a.delta.deltaPercentage : a.delta.deltaPercentage
        const bN = res.claimMap.get(b.account) ? bigNumberForPriority - b.delta.deltaPercentage : b.delta.deltaPercentage


        return Number(aN) - Number(bN)
      })
    )


    return pagingQuery(queryParams, claimPriority)
  }),
  awaitPromises
)